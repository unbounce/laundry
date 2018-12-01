import * as _ from 'lodash';

import {Path} from './types';
import * as yaml from './yaml';

export function forEachWithPath<T>(
  path: Path,
  as: Array<T>,
  fn: (path: Path, a: T, i: number|string) => void)
: void {
  _.forEach(as, (a, i) => {
    fn(path.concat(i.toString()), a, i);
  });
}

export function isNoValue(o: any) {
  return o instanceof yaml.Ref && o.data === 'AWS::NoValue';
}

export function isCfnFn(o: any): o is yaml.CfnFn {
  return o instanceof yaml.CfnFn;
}

export function toCfnFn(o: any): yaml.CfnFn|undefined {
  if(_.isObject(o)) {
    if(o instanceof yaml.CfnFn) {
      return o;
    }
    const keys = _.keys(o);
    if(keys.length === 1) {
      const name = keys[0];
      const value = o[name];
      switch (name) {
        case 'Ref':
          return new yaml.Ref(value, 'JSON');
          break;
        case 'Fn::Base64':
          return new yaml.Base64(value, 'JSON');
          break;
        case 'Fn::FindInMap':
          return new yaml.FindInMap(value, 'JSON');
          break;
        case 'Fn::GetAtt':
          return new yaml.GetAtt(value, 'JSON');
          break;
        case 'Fn::ImportValue':
          return new yaml.ImportValue(value, 'JSON');
          break;
        case 'Fn::Join':
          return new yaml.Join(value, 'JSON');
          break;
        case 'Fn::Split':
          return new yaml.Split(value, 'JSON');
          break;
        case 'Fn::Select':
          return new yaml.Select(value, 'JSON');
          break;
        case 'Fn::Sub':
          return new yaml.Sub(value, 'JSON');
          break;
        case 'Fn::And':
          return new yaml.And(value, 'JSON');
          break;
        case 'Fn::Equals':
          return new yaml.Equals(value, 'JSON');
          break;
        case 'Fn::If':
          return new yaml.If(value, 'JSON');
          break;
        case 'Fn::Not':
          return new yaml.Not(value, 'JSON');
          break;
        case 'Fn::Or':
          return new yaml.Or(value, 'JSON');
          break;
      }
    }
  }
}

export function cfnFnName(cfnFn: yaml.CfnFn) {
  const name = cfnFn.constructor.name;
  if(cfnFn.isYAML()) {
    return name;
  } else {
    if(name === 'Ref') {
      return name;
    } else {
      return `Fn::${name}`;
    }
  }
}
