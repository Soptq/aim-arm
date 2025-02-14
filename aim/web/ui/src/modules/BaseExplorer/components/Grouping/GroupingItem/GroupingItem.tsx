import React from 'react';
import _ from 'lodash-es';
import classNames from 'classnames';

import { Tooltip } from '@material-ui/core';
import { PipelineStatusEnum } from 'modules/core/engine/types';

import ErrorBoundary from 'components/ErrorBoundary/ErrorBoundary';
import ControlPopover from 'components/ControlPopover/ControlPopover';
import { Button, Text, Icon } from 'components/kit';

import { GroupingPopover } from '../GroupingPopover';

import { IGroupingItemProps } from './GroupingItem.d';

import './GroupingItem.scss';

function GroupingItem({
  groupName,
  iconName = 'chart-group',
  inputLabel,
  advancedComponent,
  title,
  ...props
}: IGroupingItemProps): React.FunctionComponentElement<React.ReactNode> {
  const { engine } = props;
  const availableModifiers = engine.useStore(
    engine.pipeline.additionalDataSelector,
  );
  const currentValues = engine.useStore(engine.groupings.currentValuesSelector);
  const isDisabled =
    engine.useStore(engine.pipeline.statusSelector) ===
    PipelineStatusEnum.Executing;

  return (
    <ErrorBoundary>
      <ControlPopover
        title={title ?? `Group by ${groupName}`}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        anchor={({ onAnchorClick, opened }) => (
          <Tooltip title={`Group by ${groupName}`}>
            <>
              <Button
                size='xSmall'
                disabled={isDisabled}
                onClick={onAnchorClick}
                className={classNames('BaseGroupingItem', {
                  active: opened,
                  outlined:
                    !_.isNil(availableModifiers) &&
                    !_.isEmpty(currentValues[groupName].fields),
                })}
              >
                <Text
                  size={12}
                  weight={600}
                  className='BaseGroupingItem__label'
                >
                  {groupName}
                </Text>
                <Icon
                  name='arrow-down-contained'
                  className={classNames('BaseGroupingItem__arrowIcon', {
                    opened,
                  })}
                  fontSize={6}
                />
              </Button>
            </>
          </Tooltip>
        )}
        component={
          <GroupingPopover
            groupName={groupName}
            inputLabel={inputLabel}
            advancedComponent={advancedComponent}
            {...props}
          />
        }
      />
    </ErrorBoundary>
  );
}

export default React.memo<IGroupingItemProps>(GroupingItem);
