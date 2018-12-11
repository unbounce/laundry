import * as _ from 'lodash';

import * as validate from '../validate';
import * as yaml from '../yaml';
import { Validator } from '../validate';
import { Path, Error } from '../types';
import { PrimitiveType, PropertyValueType } from '../spec';

type ParamSpecFn = (path: Path, cfnFn: yaml.CfnFn, errors: Error[]) => void;

export function isList(o: any) {
  return validate.list([], o, []);
}

function isString(o: any) {
  return validate.string([], o, []);
}

function cfnFnParamSpec(cfnFn: yaml.CfnFn): PropertyValueType | ParamSpecFn | undefined {
  switch (cfnFn.constructor) {
    // case yaml.ImportValue: return {};
    // case yaml.GetAZs: return {};
    // case yaml.Join: return {};
    // case yaml.Select: return {};
    case yaml.Ref: return { PrimitiveType: 'String' };
    case yaml.Condition: return { PrimitiveType: 'String' };
    case yaml.Sub: return (path: Path, cfnFn: yaml.CfnFn, errors: Error[]) => {
      // _.isString(cfnFn.data) || validate.list(path, cfnFn.data, errors, [validate.string, validate.object]);
      if (isList(cfnFn.data) && cfnFn.data.length === 2) {
        validate.string(path.concat('0'), cfnFn.data[0], errors);
        validate.object(path.concat('1'), cfnFn.data[1], errors);
      } else if (!isString(cfnFn.data)) {
        errors.push({ path, message: 'must be a String or List of Sting and Map' });
      }
    };
    case yaml.FindInMap: return (path: Path, cfnFn: yaml.CfnFn, errors: Error[]) => {
      validate.list(path, cfnFn.data, errors, Array(3).fill(validate.string));
    };
    case yaml.GetAtt: return (path: Path, cfnFn: yaml.CfnFn, errors: Error[]) => {
      if (cfnFn.isYamlTag() && isString(cfnFn.data)) {
        if (!_.includes(cfnFn.data, '.')) {
          errors.push({ path, message: 'must be a String that contains a `.`' });
        }
      } else if (!(isList(cfnFn.data) && cfnFn.data.length === 2
        && _.every(cfnFn.data, isString))) {
        if (cfnFn.isYamlTag()) {
          errors.push({ path, message: 'must be a String or a List of two Strings' });
        } else {
          errors.push({ path, message: 'must be a List of two Strings' });
        }
      }
    };
    case yaml.Base64: return { PrimitiveType: 'String' };
    case yaml.Cidr: return (path: Path, cfnFn: yaml.CfnFn, errors: Error[]) => {
      if (validate.list(path, cfnFn.data, errors) && cfnFn.data.length === 3) {
        _.forEach(cfnFn.data, (value, i) => {
          validate.string(path.concat(i.toString()), value, errors);
        });
      } else {
        errors.push({ path, message: 'must a List of three Strings' });
      }
    }
    case yaml.Split: return (path: Path, cfnFn: yaml.CfnFn, errors: Error[]) => {
      validate.list(path, cfnFn.data, errors, [validate.string, validate.string]);
    };
    case yaml.And: return { Type: 'List', PrimitiveItemType: 'Boolean' };
    case yaml.Equals: return (path: Path, cfnFn: yaml.CfnFn, errors: Error[]) => {
      if (!(isList(cfnFn.data) && cfnFn.data.length === 2)) {
        errors.push({ path, message: 'must be a List of length 2' });
      }
    };
    case yaml.If: return (path: Path, cfnFn: yaml.CfnFn, errors: Error[]) => {
      if (validate.list(path, cfnFn.data, errors)) {
        if (cfnFn.data.length === 3) {
          validate.boolean(path.concat('0'), cfnFn.data[0], errors);
        } else {
          errors.push({ path, message: 'must have three elements' });
        }
      }
    };
    case yaml.Not: return (path: Path, cfnFn: yaml.CfnFn, errors: Error[]) => {
      validate.list(path, cfnFn.data, errors, validate.boolean)
    };
    case yaml.Or: return { Type: 'List', PrimitiveItemType: 'Boolean' };
    // default: throw new Error(`Unknown CfnFn ${cfnFn}`);
  }
}

export default class CfnFnsInputsValidator extends Validator {
  resourceType: any;

  Resource(path: Path, o: any) {
    if (_.isObject(o)) {
      this.resourceType = _.get(o, 'Type');
    } else {
      this.resourceType = undefined;
    }
  }

  CfnFn(path: Path, cfnFn: yaml.CfnFn) {
    const paramSpec = cfnFnParamSpec(cfnFn);
    if (paramSpec) {
      if (_.isFunction(paramSpec)) {
        paramSpec(path, cfnFn, this.errors);
      } else if (_.isObject(paramSpec)) {
        validate.spec(path, this.resourceType, paramSpec as PropertyValueType, cfnFn.data, this.errors);
      }
    }
  }

}
