import * as _ from 'lodash';

import * as yaml from '../yaml';
import { Validator } from '../validate';
import { Path } from '../types';
import { cfnFnName } from '../util';

type SupportedFns = { [key: string]: yaml.CfnFn[] | SupportedFns };

// SUPPORTED_FNS is used as the key on `CfnFnsValidator#supportedFns` instead of
// just assigning the cfnFn's support functions to it's `path` to allow for
// children functions to be nested within that key as well.
const SUPPORTED_FNS = '__SUPPORTED_FNS__';
const FN_NAME = '__FN_NAME__';

export default class CfnFnsSupportedFnsValidator extends Validator {
  supportedFns: SupportedFns = {};

  CfnFn(path: Path, _propertyName: string, cfnFn: yaml.CfnFn) {
    // Walk the path backwards looking for the parent CfnFn, if any.
    // Error if it doesn't support this ${cfnFn}.
    let currentPath: string[] = [...path];
    while (currentPath.length) {
      currentPath.pop();
      const supportedFns = _.get(this.supportedFns, currentPath.concat(SUPPORTED_FNS));
      if (_.isArray(supportedFns)) { // We've hit a CfnFn node parent
        if (!_.includes(supportedFns, cfnFn.constructor)) {
          const fnName = _.get(this.supportedFns, currentPath.concat(FN_NAME))
          this.addError(path, `can not be used within ${fnName}`);
        }
        break; // parent found, stop searching.
      }
    }

    // Update supportedFns so that we can check any nested functions
    _.set(this.supportedFns, path.concat(SUPPORTED_FNS), cfnFn.supportedFns);
    _.set(this.supportedFns, path.concat(FN_NAME), cfnFnName(cfnFn));
  }
}
