import { base } from "@/domains/base";
import { BezierPath, LineCapType, LineJoinType, PathCompositeOperation } from "@/biz/bezier_path";

type PathProps = {
  fill?: null | {
    color: string;
  };
  stroke?: null | {
    color: string;
    width: number;
    cap?: string;
    join?: string;
  };
  closed?: boolean;
};

export function Path(props: PathProps) {
  const { fill, stroke } = props;

  let _paths: BezierPath[] = [];
  let _stroke = {
    enabled: !!stroke,
    width: 1,
    color: "#111111",
    start_cap: "butt" as LineCapType,
    end_cap: "round" as LineCapType,
    join: "miter" as LineJoinType,
  };
  if (stroke) {
    _stroke.color = stroke.color;
    _stroke.width = stroke.width;
    if (stroke.cap) {
      _stroke.start_cap = stroke.cap as LineCapType;
      _stroke.end_cap = stroke.cap as LineCapType;
    }
    if (stroke.join) {
      _stroke.join = stroke.join as LineJoinType;
    }
  }
  let _fill = {
    enabled: !!fill,
    color: "#111111",
  };
  if (fill) {
    _fill.color = fill.color;
  }
  let _composite = "source-over" as PathCompositeOperation;
  const _state = {
    get stroke() {
      return _stroke;
    },
    get fill() {
      return _fill;
    },
    get composite() {
      return _composite;
    },
  };

  enum Events {
    Change,
  }
  type TheTypesOfEvents = {
    [Events.Change]: typeof _state;
  };
  const bus = base<TheTypesOfEvents>();

  return {
    SymbolTag: "Path" as const,
    state: _state,
    get paths() {
      return _paths;
    },
    append(path: BezierPath) {
      _paths.push(path);
    },
    get composite() {
      return _composite;
    },
    setComposite(v: PathCompositeOperation) {
      _composite = v;
    },
  };
}

export type Path = ReturnType<typeof Path>;
