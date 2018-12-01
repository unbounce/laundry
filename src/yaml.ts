import * as _ from 'lodash';
import * as yaml from 'js-yaml';
import {Path, Error} from './types';
import {PropertyValueType} from './spec';
import * as validate from './validate';

type SupportedFns = Array<typeof CfnFn>;
type PropertyValueTypeFn = () => PropertyValueType;
type ParamSpecFn = (path: Path, errors: Error[]) => void;

// Function styles:
// JSON => { "Ref": "Resource" }
// YAML => !Ref Resource
export type Style = 'JSON' | 'YAML';

// Symbols are used to hid properties from yaml.dump when style = 'JSON'
const foo = Symbol('foo');
const style = Symbol('style');
const paramSpec = Symbol('paramSpec');
const returnSpec = Symbol('returnSpec');
const supportedFns = Symbol('supportedFns');
const data = Symbol('data');
const doc = Symbol('doc');

export class CfnFn {
  public [data]: any;
  public [supportedFns]: SupportedFns = [];
  public [doc]: string = 'http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference.html';
  public [paramSpec]: PropertyValueType|ParamSpecFn;
  public [returnSpec]: PropertyValueType|PropertyValueTypeFn = {};
  public [style]: Style;

  constructor(d: any, s: Style) {
    this[data] = d;
    this[style] = s;
    let name = this.constructor.name;
    if(name !== 'Ref') {
      name = `Fn::${name}`;
    }
    // @ts-ignore
    this[name] = d;
  }

  set data(d: any) {
    this[data] = d;
  }

  get data(): any {
    return this[data];
  }

  get returnSpec(): PropertyValueType|PropertyValueTypeFn {
    return this[returnSpec];
  }

  get paramSpec(): PropertyValueType|ParamSpecFn {
    return this[paramSpec];
  }

  get supportedFns(): SupportedFns {
    return this[supportedFns];
  }

  isYAML() {
    return this[style] === 'YAML';
  }

  toString() {
    return `${this.constructor.name} ${this[data]}`
  }

  toJSON() {
    return { [this.constructor.name]: this[data] };
  }
}

export class Ref extends CfnFn {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-ref.html';
  [paramSpec] =  {PrimitiveType: 'String'};
  [returnSpec] = {PrimitiveType: 'String'};
}

export class Sub extends CfnFn {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-sub.html';
  [paramSpec] = (path: Path, errors: Error[]) => {
    if (_.isArray(this.data) && this.data.length === 2) {
      validate.string(path.concat('0'), this.data[0], errors);
      validate.object(path.concat('1'), this.data[1], errors);
    } else if(!_.isString(this.data)) {
      errors.push({path, message: 'must be a String or List of Sting and Map'});
    }
  };
  [returnSpec] = {PrimitiveType: 'String'};
  [supportedFns]: SupportedFns = [Base64, FindInMap, GetAtt, GetAZs, If, ImportValue, Join, Select, Ref];
}

export class FindInMap extends CfnFn {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-findinmap.html';
  [returnSpec] = {PrimitiveType: 'String'};
  [supportedFns]: SupportedFns = [FindInMap, Ref];
}

export class GetAtt extends CfnFn {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-getatt.html';
  [paramSpec] = (path: Path, errors: Error[]) => {
    if(this.isYAML() && _.isString(this.data) ) {
      if(!_.includes(this.data, '.')) {
        errors.push({path, message: 'must be a String that contains a `.`'});
      }
    } else if(!(_.isArray(this.data) && this.data.length === 2 && _.every(this.data, _.isString))) {
      if(this.isYAML()) {
        errors.push({path, message: 'must be a String or a List of two Strings'});
      } else {
        errors.push({path, message: 'must be a List of two Strings'});
      }
    }
  };
  [returnSpec] = {PrimitiveType: 'String'};
  [supportedFns]: SupportedFns = [Ref]; // Only for attribute name
}

export class ImportValue extends CfnFn {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-importvalue.html';
  [returnSpec] = {PrimitiveType: 'String'};
  [supportedFns]: SupportedFns = [Base64, FindInMap, If, Join, Select, Split, Sub, Ref];
}

export class Base64 extends CfnFn {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-base64.html';
  [returnSpec] = {PrimitiveType: 'String'};
  [supportedFns]: SupportedFns = [Ref, Sub, FindInMap, GetAtt, ImportValue, Base64, Cidr, GetAZs, Join, Split, Select, And, Equals, If, Not, Or];
}

export class Cidr extends CfnFn {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-cidr.html';
  [returnSpec] = {Type: 'List', PrimitiveItemType: 'String'};
}

export class GetAZs extends CfnFn {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-getavailabilityzones.html';
  [returnSpec] = {Type: 'List', PrimitiveItemType: 'String'};
}
export class Join extends CfnFn {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-join.html';
  [returnSpec] = {
    PrimitiveType: 'String'
  }
  allowedFns: [Base64, FindInMap, GetAtt, GetAZs, If, ImportValue, Join, Split, Select, Sub, Ref];
}
export class Split extends CfnFn {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-split.html';
  [returnSpec] = {Type: 'List', PrimitiveItemType: 'String'}
  allowedFns: [Base64, FindInMap, GetAtt, GetAZs, If, ImportValue, Join, Select, Sub, Ref];
}
export class Select extends CfnFn {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-select.html';
  [returnSpec] = {PrimitiveType: 'String'}
  allowedFns = [FindInMap, GetAtt, GetAZs, If, Split, Ref];
}
// export class GetParam extends CfnFn {
//   [doc] = 'http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/continuous-delivery-codepipeline-action-reference.html'
// }
//
export class And extends CfnFn {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-conditions.html#intrinsic-function-reference-conditions-and';
  [returnSpec] = {Type: 'Boolean'};
  allowedFns: SupportedFns = [FindInMap, Ref, And, Equals, If, Not, Or];
}
export class Equals extends CfnFn {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-conditions.html#intrinsic-function-reference-conditions-equals';
  [returnSpec] = {Type: 'Boolean'};
  allowedFns: SupportedFns = [FindInMap, Ref, And, Equals, If, Not, Or];
}
export class If extends CfnFn {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-conditions.html#intrinsic-function-reference-conditions-if';
  allowedFns = [Base64, FindInMap, GetAtt, GetAZs, If, Join, Select, Sub, Ref];
  [returnSpec] = () => {
    const value = this.data;
    if(_.isArray(value) && value.length === 3) {
      const a = paramToReturnSpec(value[1]);
      const b = paramToReturnSpec(value[2]);
      if(_.isEqual(a, b)) {
        return a;
      }
    }
    return {};
  };
}
function paramToReturnSpec(o: any): PropertyValueType {
  if(_.isString(o)) {
    return { PrimitiveType: 'String' };
  } else if(_.isNumber(o)) {
    return { PrimitiveType: 'Number' };
  } else if(_.isBoolean(o)) {
    return { PrimitiveType: 'Boolean' };
  } else if (o instanceof CfnFn) {
    if(_.isFunction(o.returnSpec)) {
      return o.returnSpec();
    } else {
      return o.returnSpec;
    }
  } else {
    return {};
  }
}
export class Not extends CfnFn {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-conditions.html#intrinsic-function-reference-conditions-not';
  allowedFns: SupportedFns = [FindInMap, Ref, And, Equals, If, Not, Or];
  [returnSpec] = {Type: 'Boolean'};
}
export class Or extends CfnFn {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-conditions.html#intrinsic-function-reference-conditions-or';
  allowedFns: SupportedFns = [FindInMap, Ref, And, Equals, If, Not, Or];
  [returnSpec] = {Type: 'Boolean'};
}

function tag(cls: any) {
  // Accept all 'kinds' so that js-yaml will load invalid formats and then we
  // can lint them
  return _.map(['scalar', 'mapping', 'sequence'], (kind) => {
    // @ts-ignore
    // predicate is mis-typed in the type definitions
    return new yaml.Type(`!${cls.name}`, {
      kind,
      construct: (data: any) => new cls(data, 'YAML'),
      represent: (node: any) => node.data,
      predicate: (node: any) => node instanceof cls && node.isYAML()
    });
  })
}

const types = _.concat(
  tag(Ref),
  tag(Base64),
  tag(FindInMap),
  tag(GetAtt),
  tag(GetAZs),
  tag(ImportValue),
  tag(Join),
  tag(Split),
  tag(Ref),
  tag(Ref),
  tag(Select),
  tag(Sub),
  // tag(GetParam),
  tag(And),
  tag(Equals),
  tag(If),
  tag(Not),
  tag(Or),
);

const schema = yaml.Schema.create(yaml.JSON_SCHEMA, types);

export function load(contents: string) {
  return yaml.load(contents, { schema });
}

export function dump(obj: object) {
  return yaml.dump(obj, { schema }).replace(/!<!([^>]+?)>/g, '!$1');
}
