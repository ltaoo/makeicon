import { Point } from "@/biz/point";
import { base } from "@/domains/base";

type GradientColorProps = {
  start: {
    x: number;
    y: number;
  };
  end: {
    x: number;
    y: number;
  };
  d1: number;
  d2: number;
};
export function GradientColor(props: GradientColorProps) {
  const _state = {};
  enum Events {
    Change,
  }
  type TheTypesOfEvents = {
    [Events.Change]: typeof _state;
  };
  const bus = base<TheTypesOfEvents>();
  const ins = {
    Symbol: "GradientColor" as const,
    state: _state,
  };
  return ins;
}

export type GradientColor = ReturnType<typeof GradientColor>;
