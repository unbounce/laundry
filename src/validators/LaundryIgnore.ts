import * as _ from 'lodash';
import { Path, Error } from '../types';
import { Validator } from '../validate';
import * as validate from '../validate';

export type IgnoredValidator = {
  path: Path,
  source: string
}

export default class LaundryIgnore extends Validator {
  constructor(public ignoredValidators: IgnoredValidator[], errors: Error[]) {
    super(errors);
  }

  Metadata(path: Path, metadata: any): void {
    if(_.isObject(metadata) && 'LaundryIgnore' in metadata) {
      const laundryIgnore = metadata['LaundryIgnore'];
      for (const key in laundryIgnore) {
        const validators = laundryIgnore[key];
        if (validate.list(path.concat(key), validators, this.addError, validate.string)) {
          for (const rule of validators) {
            this.ignoredValidators.push({
              path: `Root.${key}`.split('.'),
              source: rule
            });
          }
        }
      }
    }
  }

  Resource(path: Path, resource: any): void {
    if(_.isObject(resource) && 'Metadata' in resource) {
      if(_.isObject(resource.Metadata) && 'LaundryIgnore' in resource.Metadata) {
        const validators = resource.Metadata.LaundryIgnore;
        if (validate.list(path.concat(['Metadata', 'LaundryIgnore']), validators, this.addError, validate.string)) {
          for (const source of validators) {
            this.ignoredValidators.push({
              path: path.concat('*'),
              source
            });
          }
        }
      }
    }
  }
}
