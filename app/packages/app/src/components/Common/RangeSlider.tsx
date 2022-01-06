import React, { useEffect, useState } from "react";
import styled from "styled-components";
import {
  RecoilState,
  RecoilValueReadOnly,
  useRecoilState,
  useRecoilStateLoadable,
  useRecoilValue,
} from "recoil";
import { Slider as SliderUnstyled } from "@material-ui/core";

import { DATE_FIELD, DATE_TIME_FIELD } from "@fiftyone/utilities";

import * as selectors from "../../recoil/selectors";
import { useTheme } from "../../utils/hooks";
import { getFormatter, getStep } from "./utils";
import { getDateTimeRangeFormattersWithPrecision } from "../../utils/generic";

const SliderContainer = styled.div`
  font-weight: bold;
  display: flex;
  padding: 1.5rem 0 0.5rem;
  line-height: 1.9rem;
`;

const SliderStyled = styled(SliderUnstyled)`
  && {
    color: ${({ theme }) => theme.brand};
    margin: 0 1.5rem 0 1.3rem;
    height: 3px;
  }

  .rail {
    height: 7px;
    border-radius: 6px;
  }

  .track {
    height: 7px;
    border-radius: 6px;
    background: ${({ theme }) => theme.brand};
  }

  .thumb {
    height: 1rem;
    width: 1rem;
    border-radius: 0.5rem;
    background: ${({ theme }) => theme.brand};
    box-shadow: none;
    color: transparent;
  }

  .thumb:hover,
  .thumb:focus,
  .thumb.active {
    box-shadow: none;
  }

  .valueLabel {
    width: auto;
    margin-top: 0.5rem;
    font-weight: bold;
    font-family: "Palanquin", sans-serif;
    font-size: 14px;
    padding: 0.2rem;
    border-radius: 6rem;
    color: transparent;
    transform: none !important;
    margin-top: -4px;
  }

  .valueLabel > span > span {
    text-align: center;
    color: ${({ theme }) => theme.font};
    background: ${({ theme }) => theme.backgroundDark};
    border: 1px solid ${({ theme }) => theme.backgroundDarkBorder};
  }
`;

type SliderValue = number | undefined;

export type Range = [SliderValue, SliderValue];

type BaseSliderProps = {
  boundsAtom: RecoilValueReadOnly<Range>;
  color: string;
  value: Range | number;
  onChange: (e: Event, v: Range | number) => void;
  onCommit: (e: Event, v: Range | number) => void;
  persistValue?: boolean;
  showBounds?: boolean;
  fieldType?: string;
  showValue: boolean;
  int?: boolean;
  style?: React.CSSProperties;
};

const BaseSlider = React.memo(
  ({
    boundsAtom,
    color,
    fieldType,
    onChange,
    onCommit,
    persistValue = true,
    showBounds = true,
    value,
    style,
    showValue = true,
  }: BaseSliderProps) => {
    const theme = useTheme();
    const bounds = useRecoilValue(boundsAtom);

    const timeZone =
      fieldType && [DATE_FIELD, DATE_TIME_FIELD].includes(fieldType)
        ? useRecoilValue(selectors.timeZone)
        : null;
    const [clicking, setClicking] = useState(false);

    const hasBounds = bounds.every((b) => b !== null);

    if (!hasBounds) {
      return null;
    }

    const step = getStep(bounds, fieldType);
    const { formatter, hasTitle } = getFormatter(
      fieldType,
      fieldType === DATE_FIELD ? "UTC" : timeZone,
      bounds
    );

    return (
      <>
        {hasTitle ? (
          <>
            {
              <div
                style={{
                  width: "100%",
                  textAlign: "center",
                  padding: "0.25rem",
                  color: theme.font,
                }}
              >
                {getDateTimeRangeFormattersWithPrecision(
                  timeZone,
                  bounds[0],
                  bounds[1]
                )[0]
                  .format(bounds[0])
                  .replaceAll("/", "-")}
              </div>
            }
          </>
        ) : null}
        <SliderContainer style={style}>
          {showBounds && formatter(bounds[0])}
          <SliderStyled
            onMouseDown={() => setClicking(true)}
            onMouseUp={() => setClicking(false)}
            value={value}
            onChange={onChange}
            onChangeCommitted={(e, v) => {
              onCommit(e, v);
              setClicking(false);
            }}
            classes={{
              thumb: "thumb",
              track: "track",
              rail: "rail",
              active: "active",
              valueLabel: "valueLabel",
            }}
            valueLabelFormat={formatter}
            aria-labelledby="slider"
            valueLabelDisplay={
              (clicking || persistValue) && showValue ? "on" : "off"
            }
            max={bounds[1]}
            min={bounds[0]}
            step={step}
            theme={{ ...theme, brand: color }}
          />
          {showBounds && formatter(bounds[1])}
        </SliderContainer>
      </>
    );
  }
);

type SliderProps = {
  valueAtom: RecoilState<SliderValue>;
  boundsAtom: RecoilValueReadOnly<Range>;
  color: string;
  persistValue?: boolean;
  fieldType?: string;
  showValue?: boolean;
  showBounds?: boolean;
  onChange?: boolean;
  int?: boolean;
  style?: React.CSSProperties;
};

export const Slider = ({ valueAtom, onChange, ...rest }: SliderProps) => {
  const [value, setValue] = useRecoilState(valueAtom);
  const [localValue, setLocalValue] = useState<SliderValue>(null);
  useEffect(() => {
    JSON.stringify(value) !== JSON.stringify(localValue) &&
      setLocalValue(value);
  }, [value]);

  return (
    <BaseSlider
      {...rest}
      onChange={(_, v) => (onChange ? setValue(v) : setLocalValue(v))}
      onCommit={(_, v) => setValue(v)}
      value={localValue}
    />
  );
};

type RangeSliderProps = {
  valueAtom: RecoilState<Range>;
  boundsAtom: RecoilValueReadOnly<Range>;
  color: string;
  showBounds?: boolean;
  fieldType: string;
};

export const RangeSlider = ({ valueAtom, ...rest }: RangeSliderProps) => {
  const [value, setValue] = useRecoilStateLoadable(valueAtom);
  const [localValue, setLocalValue] = useState<Range>([null, null]);
  useEffect(() => {
    value.state !== "loading" &&
      JSON.stringify(value.contents) !== JSON.stringify(localValue) &&
      setLocalValue(value.contents);
  }, [value]);

  return (
    <BaseSlider
      {...rest}
      onChange={(_, v: Range) => setLocalValue(v)}
      onCommit={(_, v) => setValue(v)}
      value={[...localValue]}
    />
  );
};

export default RangeSlider;