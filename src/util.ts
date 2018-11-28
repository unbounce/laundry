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

export function toCfnFn(o: any): yaml.CfnFn<any>|undefined {
  if(_.isObject(o)) {
    const keys = _.keys(o);
    if(keys.length === 1) {
      const name = keys[0];
      const value = o[name];
      switch (name) {
        case 'Ref':
          return new yaml.Ref(value);
          break;
        case 'Fn::Base64':
          return new yaml.Base64(value);
          break;
        case 'Fn::FindInMap':
          return new yaml.FindInMap(value);
          break;
        case 'Fn::GetAtt':
          return new yaml.GetAtt(value);
          break;
        case 'Fn::ImportValue':
          return new yaml.ImportValue(value);
          break;
        case 'Fn::Join':
          return new yaml.Join(value);
          break;
        case 'Fn::Split':
          return new yaml.Split(value);
          break;
        case 'Fn::Select':
          return new yaml.Select(value);
          break;
        case 'Fn::Sub':
          return new yaml.Sub(value);
          break;
        case 'Fn::And':
          return new yaml.And(value);
          break;
        case 'Fn::Equals':
          return new yaml.Equals(value);
          break;
        case 'Fn::If':
          return new yaml.If(value);
          break;
        case 'Fn::Not':
          return new yaml.Not(value);
          break;
        case 'Fn::Or':
          return new yaml.Or(value);
          break;
      }
    }
  }
}
