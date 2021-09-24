import * as _ from 'lodash';
import { Validator } from '../validate';
import { Path } from '../types';
import { CfnFn } from '../yaml';
import arn from '../validate/arn';

export default class ARNFormatValidator extends Validator {
  ResourceProperty(path: Path, name: string, value: any) {
    if (_.isString(value)) {
    this.maybeValidateARN(path, value);
    } else if (value instanceof CfnFn && _.isString(value.resolvedValue)) {
      this.maybeValidateARN(path, value.resolvedValue);
    }
  }

  maybeValidateARN(path: Path, value: string) {
    if (_.startsWith(value, 'arn:')) {
      arn(path, value, this.addError);
    }
  }

}
