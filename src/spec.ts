import * as _ from 'lodash';
import { Path, Error } from './types';
import CloudFormationResourceSpecification from './specs/CloudFormationResourceSpecification.json';
import ServerlessResourceSpecification from './specs/ServerlessResourceSpecification.json';
import CloudFormationResourceSpecificationOverrides from './specs/CloudFormationResourceSpecificationOverrides.json';
import AtLeastOneSpec from './specs/AtLeastOne.json';

export type PrimitiveType = string; //'Boolean' | 'Double' | 'Integer' | 'Json' | 'Long' | 'String' | 'Timestamp';
type UpdateType = string; // 'Immutable' | 'Mutable' | 'Conditional';
export type Type = string; // TODO better type
export type PropertyValueType = {
  PrimitiveType?: PrimitiveType
  Type?: Type,
  PrimitiveItemType?: PrimitiveType
  ItemType?: Type
}
export type Attributes = {
  [attribute: string]: PropertyValueType
};
export type ResourceType = {
  Attributes?: Attributes,
  Documentation: string,
  Properties: {
    [property: string]: {
      Documentation: string,
      Required: boolean,
      UpdateType: UpdateType
    } & PropertyValueType
  }
}
export type PropertyType = {
  Documentation: string,
  Properties: {
    [property: string]: {
      Documentation: string,
      Required: boolean,
      UpdateType: UpdateType
    } & PropertyValueType
  }
}
export type AtLeastOne = {
  PropertyTypes: {},
  ResourceTypes: {
    [key: string]: string[][]
  }
}

const spec = _.merge(
  {},
  CloudFormationResourceSpecification,
  ServerlessResourceSpecification,
  CloudFormationResourceSpecificationOverrides
);

export const ResourceTypes: { [resourceType: string]: ResourceType } = spec.ResourceTypes;
export const PropertyTypes: { [propertyType: string]: PropertyType } = spec.PropertyTypes;
export const AtLeastOne: AtLeastOne = AtLeastOneSpec;
