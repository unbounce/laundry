import * as _ from 'lodash';
import didYouMean from 'didyoumean2';

import { PropertyValueType } from './spec';
import * as yaml from './yaml';

export function isNoValue(o: any) {
  return o instanceof yaml.Ref && o.data === 'AWS::NoValue';
}

export function isCfnFn(o: any): o is yaml.CfnFn {
  return o instanceof yaml.CfnFn;
}

export function toCfnFn(o: any): yaml.CfnFn | undefined {
  if (_.isObject(o)) {
    if (o instanceof yaml.CfnFn) {
      return o;
    }
    const keys = _.keys(o);
    if (keys.length === 1) {
      const name = keys[0];
      const value = o[name];
      switch (name) {
        case 'Ref':
          return new yaml.Ref(value, 'Object');
        case 'Fn::Base64':
          return new yaml.Base64(value, 'Object');
        case 'Fn::FindInMap':
          return new yaml.FindInMap(value, 'Object');
        case 'Fn::GetAtt':
          return new yaml.GetAtt(value, 'Object');
        case 'Fn::GetAZs':
          return new yaml.GetAZs(value, 'Object');
        case 'Fn::ImportValue':
          return new yaml.ImportValue(value, 'Object');
        case 'Fn::Join':
          return new yaml.Join(value, 'Object');
        case 'Fn::Split':
          return new yaml.Split(value, 'Object');
        case 'Fn::Select':
          return new yaml.Select(value, 'Object');
        case 'Fn::Sub':
          return new yaml.Sub(value, 'Object');
        case 'Fn::And':
          return new yaml.And(value, 'Object');
        case 'Fn::Equals':
          return new yaml.Equals(value, 'Object');
        case 'Fn::If':
          return new yaml.If(value, 'Object');
        case 'Fn::Not':
          return new yaml.Not(value, 'Object');
        case 'Fn::Or':
          return new yaml.Or(value, 'Object');
        case 'Condition':
          return new yaml.Condition(value, 'Object');
      }
    }
  }
}

export function cfnFnName(cfnFn: yaml.CfnFn) {
  const name = cfnFn.constructor.name;
  if (cfnFn.isYamlTag()) {
    return name;
  } else {
    if (name === 'Ref' || name === 'Condition') {
      return name;
    } else {
      return `Fn::${name}`;
    }
  }
}

export function isStringNumber(o: any): boolean {
  return _.isFinite(_.parseInt(o));
}

export function isStringBoolean(o: any): boolean {
  return Boolean(_.isString(o) && o.match(/true|false|yes|no/i));
}

export function valueToSpecs(o: any): PropertyValueType[] | null {
  if (_.isString(o)) {
    const types = [{ PrimitiveType: 'String' }];
    if (isStringNumber(o)) {
      types.push({ PrimitiveType: 'Number' });
    }
    return types;
  } else if (_.isNumber(o)) {
    return [{ PrimitiveType: 'Number' }];
  } else if (_.isBoolean(o)) {
    return [{ PrimitiveType: 'Boolean' }];
  } else if (_.isArray(o)) {
    // BUG? childSpecs below is unused
    const childSpecs = _.reduce(o, (acc, child) => {
      const specs = _.reduce(valueToSpecs(child), (acc, s) => {
        if (s.PrimitiveType) {
          acc.push({ Type: 'List', PrimitiveItemType: s.PrimitiveType });
        } else if (s.ItemType) {
          acc.push({ Type: 'List', ItemType: s.Type });
        }
        return acc;
      }, [] as PropertyValueType[]);

      if (specs && !_.isEmpty(specs)) {
        return _.concat(acc, _.uniqWith(specs, _.isEqual));
      } else {
        return acc;
      }
    }, [] as PropertyValueType[]);
    return [{ Type: 'List', PrimitiveItemType: 'String' }];
  } else if (o instanceof yaml.CfnFn) {
    if (o instanceof yaml.Ref && o.data === 'AWS::NoValue') {
      return null;
    } else {
      if (_.isFunction(o.returnSpec)) {
        return o.returnSpec();
      } else {
        return o.returnSpec;
      }
    }
  } else if (_.isPlainObject(o)) {
    return [{ PrimitiveType: 'Json' }];
  } else {
    return [];
  }
}

export function subVariables(sub: yaml.Sub) {
  let template;                 // TODO improve typesafety here
  if (_.isString(sub.data)) {
    template = sub.data;
  } else if (_.isArray(sub.data) && _.isString(sub.data[0]) && _.isArray(sub.data[1])) {
    template = sub.data[0];
  }
  const variables = [];
  const r = /\$\{([^!][^}]*)\}/g
  let match;
  while (match = r.exec(template as string)) {
    variables.push(_.trim(match[1]));
  }
  return variables;
}


export function withSuggestion(message: string, matchList: string[], input: string) {
  const suggestion = didYouMean(input, matchList);
  if (suggestion) {
    return `${message}, did you mean ${suggestion}?`;
  } else {
    return message;
  }
}
