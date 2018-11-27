import * as _ from 'lodash';

import {Path} from './types';

export class Visitor {
  // Root

  Root(path: Path, root: any): void {}
  AWSTemplateFormatVersion(path: Path, version: any): void {}
  Description(path: Path, description: any): void {}
  Metadata(path: Path, metadata: any): void {}
  Parameters(path: Path, parameters: any): void {}
  Mappings(path: Path, mappings: any): void {}
  Conditions(path: Path, conditions: any): void {}
  Transform(path: Path, transform: any): void {}
  Resources(path: Path, resources: any): void {}
  Outputs(path: Path, outputs: any): void {}

  Parameter(path: Path, parameter: any): void {}

  Mapping(path: Path, mapping: any): void {}

  Condition(path: Path, condition: any): void {}

  Resource(path: Path, resource: any): void {}
  // Properties(path: Path, properties: any): void {}
  // Property(path: Path, property: any): void {}

  Output(path: Path, output: any): void {}

}

export class Walker {
  private paths: Path[] = [];
  private visitors: Visitor[] = [];

  constructor(visitors: Visitor[]) {
    this.visitors = visitors;
  }

  private pushPath(s: string): Path {
    // Push new path onto the stack without modifying existing one
    const prevPath = _.get(this.paths, this.paths.length - 1, []);
    const path = [...prevPath, s];
    this.paths.push(path);
    return path;
  }

  private popPath() {
    // Return to the previous path in the stack
    this.paths.pop();
  }

  Root(root: object): void {
    const path = this.pushPath('Root');
    _.forEach(this.visitors, (v) => v.Root(path, root));

    this.AWSTemplateFormatVersion(_.get(root, 'AWSTemplateFormatVersion'));
    this.Description(_.get(root, 'Description'));
    this.Metadata(_.get(root, 'Metadata'));
    this.Parameters(_.get(root, 'Parameters'));
    this.Mappings(_.get(root, 'Mappings'));
    this.Conditions(_.get(root, 'Conditions'));
    this.Transform(_.get(root, 'Transform'));
    this.Resources(_.get(root, 'Resources'));
    this.Outputs(_.get(root, 'Outputs'));
    this.popPath();
  }

  AWSTemplateFormatVersion(version: any): void {
    const path = this.pushPath('AWSTemplateFormatVersion');
    _.forEach(this.visitors, (v) => v.AWSTemplateFormatVersion(path, version));
    this.popPath();
  }

  Description(description: any): void {
    const path = this.pushPath('Description');
    _.forEach(this.visitors, (v) => v.Description(path, description));
    this.popPath();
  }

  Metadata(metadata: any): void {
    const path = this.pushPath('Metadata');
    _.forEach(this.visitors, (v) => v.Metadata(path, metadata));
    this.popPath();
  }

  Parameters(parameters: any): void {
    const path = this.pushPath('Parameters');
    _.forEach(this.visitors, (v) => v.Parameters(path, parameters));

     if(_.isObject(parameters)) {
      _.forEach(parameters, (parameter, name) => {
        this.pushPath(name);
        _.forEach(this.visitors, (v) => v.Parameter(path, parameter));
        this.popPath();
      });
    }
    this.popPath();
  }

  Mappings(mappings: any): void {}
  Conditions(conditions: any): void {}
  Transform(transform: any): void {}

  Resources(resources: any): void {
    let path = this.pushPath('Resources');
    _.forEach(this.visitors, (v) => v.Resources(path, resources));

     if(_.isObject(resources)) {
      _.forEach(resources, (resource, name) => {
        let path = this.pushPath(name);
        _.forEach(this.visitors, (v) => v.Resource(path, resource));
        this.popPath();
      });
    }
    this.popPath();
  }

  Outputs(outputs: any): void {}
}
