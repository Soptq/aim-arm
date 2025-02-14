import React from 'react';

import { Checkbox, Divider, TextField } from '@material-ui/core';
import { Autocomplete } from '@material-ui/lab';
import {
  CheckBox as CheckBoxIcon,
  CheckBoxOutlineBlank,
} from '@material-ui/icons';

import { Badge, Text, ToggleButton } from 'components/kit';
import ErrorBoundary from 'components/ErrorBoundary/ErrorBoundary';

import { SelectOption } from '../CaptionProperties.d';

import { ICaptionPropertiesPopoverProps } from '.';

import './CaptionPropertiesPopover.scss';

function CaptionPropertiesPopover(
  props: ICaptionPropertiesPopoverProps,
): React.FunctionComponentElement<React.ReactNode> {
  const {
    captionProperties,
    visualizationName,
    engine: {
      useStore,
      pipeline: { additionalDataSelector },
      visualizations,
    },
  } = props;
  const updateCaptionProperties =
    visualizations[visualizationName].controls.captionProperties.methods.update;

  const availableModifiers = useStore(additionalDataSelector);
  const [searchValue, setSearchValue] = React.useState<string>('');

  const handleSelect = React.useCallback(
    (values: SelectOption[]): void => {
      updateCaptionProperties({
        ...captionProperties,
        selectedFields: values.map((item: SelectOption) => item.value),
      });
    },
    [captionProperties, updateCaptionProperties],
  );

  const onSelectedFieldsChange = React.useCallback(
    (e: any, values: SelectOption[]): void => {
      if (e?.code !== 'Backspace') {
        handleSelect(values);
      } else {
        if (searchValue.length === 0) {
          handleSelect(values);
        }
      }
    },
    [handleSelect, searchValue.length],
  );

  const onDisplayBoxCaptionChange = React.useCallback(
    (value): void => {
      updateCaptionProperties({
        ...captionProperties,
        displayBoxCaption: value === 'Show',
      });
    },
    [captionProperties, updateCaptionProperties],
  );

  const options = React.useMemo(() => {
    const modifiers = availableModifiers?.modifiers ?? [];
    const optionsData: SelectOption[] = modifiers.map((modifier: string) => {
      return {
        label: modifier,
        value: modifier,
        group: modifier.slice(0, modifier.indexOf('.')),
      };
    });
    return (
      optionsData?.filter(
        (option: SelectOption) => option.label.indexOf(searchValue) !== -1,
      ) ?? []
    );
  }, [availableModifiers?.modifiers, searchValue]);

  const values: SelectOption[] = React.useMemo(() => {
    let data: { value: string; group: string; label: string }[] = [];
    options.forEach((option: SelectOption) => {
      if (captionProperties.selectedFields.indexOf(option.value) !== -1) {
        data.push(option);
      }
    });

    // Sort selected values by the order of their application
    return data.sort(
      (a, b) =>
        captionProperties.selectedFields.indexOf(a.value) -
        captionProperties.selectedFields.indexOf(b.value),
    );
  }, [options, captionProperties.selectedFields]);

  return (
    <ErrorBoundary>
      <div className='CaptionPropertiesPopover'>
        <div className='CaptionPropertiesPopover__section'>
          <Text
            component='h4'
            tint={50}
            className='CaptionPropertiesPopover__subtitle'
          >
            Select Fields To Display In The Box Caption
          </Text>
          <Autocomplete
            id='select-params'
            size='small'
            openOnFocus
            multiple
            disableCloseOnSelect
            options={options}
            value={values}
            onChange={onSelectedFieldsChange}
            groupBy={(option: SelectOption) => option.group}
            getOptionLabel={(option: SelectOption) => option.label}
            getOptionSelected={(option: SelectOption, value: SelectOption) =>
              option.value === value.value
            }
            renderInput={(params) => (
              <TextField
                {...params}
                inputProps={{
                  ...params.inputProps,
                  value: searchValue,
                  onChange: (e: any) => {
                    setSearchValue(e.target.value);
                  },
                }}
                className='TextField__OutLined__Small'
                variant='outlined'
                placeholder='Select Fields'
              />
            )}
            renderOption={(option, { selected }) => (
              <React.Fragment>
                <div className='CaptionPropertiesPopover__option'>
                  <Checkbox
                    color='primary'
                    size='small'
                    icon={<CheckBoxOutlineBlank />}
                    checkedIcon={<CheckBoxIcon />}
                    style={{ marginRight: 4 }}
                    checked={selected}
                  />
                  <Text
                    className='CaptionPropertiesPopover__option__label'
                    size={14}
                  >
                    {option.label}
                  </Text>
                </div>
              </React.Fragment>
            )}
            renderTags={(value, getTagProps) => (
              <div className='CaptionPropertiesPopover__SelectedTagsContainer'>
                {value.map((selected, i) => (
                  <Badge
                    key={i}
                    {...getTagProps({ index: i })}
                    label={selected.label}
                    size='small'
                    className='Select__Chip'
                  />
                ))}
              </div>
            )}
          />
        </div>
        <Divider className='CaptionPropertiesPopover__Divider' />
        <div className='CaptionPropertiesPopover__section'>
          <Text
            component='h4'
            tint={50}
            className='CaptionPropertiesPopover__subtitle'
          >
            Toggle The Box Caption Visibility
          </Text>
          <ToggleButton
            title='Select Mode'
            id='display'
            value={captionProperties.displayBoxCaption ? 'Show' : 'Hide'}
            leftLabel='Hide'
            rightLabel='Show'
            leftValue={'Hide'}
            rightValue={'Show'}
            onChange={onDisplayBoxCaptionChange}
          />
        </div>
      </div>
    </ErrorBoundary>
  );
}

CaptionPropertiesPopover.displayName = 'CaptionPropertiesPopover';

export default React.memo<ICaptionPropertiesPopoverProps>(
  CaptionPropertiesPopover,
);
