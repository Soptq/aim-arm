import os
import logging

from filelock import BaseFileLock, SoftFileLock, UnixFileLock, has_fcntl

from cachetools.func import ttl_cache
from psutil import disk_partitions

from typing import Optional, Union, Dict, Set, Tuple

logger = logging.getLogger(__name__)


class FileSystemInspector:
    """
    This class is used to inspect the file system state and determine if the
    file being created can use `fcntl` / `flock` or should use soft file locks.

    This can be achieved by finding the device owning the parent directory and
    mapping it to the partition and finally checking the filesystem type.

    We prefer using soft file locks *only* if there is a risk of the filesystem
    not being able to handle `fcntl` implementations.
    (e.g. remote filesystems, including NFS<4, BeeGFS, Lustre, etc.)
    """
    GLOBAL_FILE_LOCK_CAPABLE_FILESYSTEMS: Set[str] = {
        # The most popular local filesystems
        'ext3', 'ext4', 'xfs', 'zfs', 'apfs',
        # We include only NFS v4 filesystems here (yet).
        # NFS v3 does not support file locks.
        'nfs4',
    }
    warned_devices: Set[int] = set()

    @classmethod
    def _warn_only_once(
        cls,
        path: str,
        device: int,
        fstype: Optional[str],
    ) -> None:
        """
        Warn only once per device. This is used to avoid spamming the logs with
        the same message.
        """
        if device in cls.warned_devices:
            return
        cls.warned_devices.add(device)

        if fstype is None:
            logger.warning(
                f"Failed to determine filesystem type for {path} "
                f"(device id: {device}). "
                f"Using soft file locks to avoid potential data corruption."
            )
            return

        logger.warning(
            f"The lock file {path} is on a filesystem of type `{fstype}` "
            f"(device id: {device}). "
            f"Using soft file locks to avoid potential data corruption."
        )

    @classmethod
    @ttl_cache(ttl=10)
    def dev_fstype_mapping(cls) -> Dict[int, str]:
        """
        Returns a mapping of device numbers to filesystem types.
        """
        mapping: Dict[int, str] = {}
        for partition in disk_partitions(all=True):
            try:
                device_id = os.lstat(partition.mountpoint).st_dev
            except (OSError, ValueError, AttributeError):
                continue
            mapping[device_id] = partition.fstype
        return mapping

    @classmethod
    def get_fs(cls, path: str) -> Tuple[Optional[int], Optional[str]]:
        """
        Returns the device id and the filesystem type of the file / directory
        at the given path.

        If the path does not exist, `None` is returned.
        """
        try:
            stat = os.stat(path)
        except (OSError, ValueError, AttributeError):
            return None, None

        return stat.st_dev, cls.dev_fstype_mapping().get(stat.st_dev)

    @classmethod
    def needs_soft_lock(cls, path: str) -> bool:
        """
        Returns `True` if the file system of the given path is not capable of
        using `fcntl` locks.

        This simply checks the device that the parent node resides on and
        depending on the filesystem type, returns `True` or `False`.

        For unknown filesystem types, we'll use soft file locks.
        """
        if not has_fcntl:
            # We can't use `fcntl` locks on this platform no matter the
            # underlying filesystem type. The `filelock` package will log a
            # warning if this happens. No need to log it again.
            return True

        dirname = os.path.dirname(path)
        device_id, fstype = cls.get_fs(dirname)

        # We'll move forward with `fcntl` locks for certain filesystems.
        if fstype in cls.GLOBAL_FILE_LOCK_CAPABLE_FILESYSTEMS:
            return False

        # In all other cases, we'll use soft file locks.
        cls._warn_only_once(path, device_id, fstype)
        return True


def AutoFileLock(
    lock_file: Union[str, os.PathLike],
    timeout: float = -1
) -> BaseFileLock:
    """
    Returns a file lock based on the file system type of the given path.

    If the file system of the given path is not capable of using `fcntl` locks,
    a soft file lock is used.

    If the file system type of the given path is failed to be determined,
    a soft file lock is used.


    :param lock_file: path to the file
    :param timeout: default timeout when acquiring the lock. It will be used as
        fallback value in the acquire method, if no timeout value (``None``) is
        given. If you want to disable the timeout, set it to a negative value.
        A timeout of 0 means, that there is exactly one attempt to acquire the
        file lock.
    """
    if not FileSystemInspector.needs_soft_lock(lock_file):
        return UnixFileLock(lock_file, timeout)
    else:
        # Cleaning lock files is not required by `FileLock`. The leftover lock files
        # (potentially from previous versions) could be interpreted as *acquired*
        # locks by `SoftFileLock` causing a deadlock.
        # To prevent this, we add a suffix to the lock file name.
        return SoftFileLock(f'{lock_file}.softlock', timeout)
