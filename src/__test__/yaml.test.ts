import {load, dump, Ref, CfnFn} from '../yaml';

describe('load', () => {
  test('with ref', () => {
    const expected = {
      foo: new Ref('bar', 'YAMLTag')
    };
    expect(load('foo: !Ref bar')).toEqual(expected);
  });
});

describe('dump', () => {
  test('with YAMLTag style', () => {
    const input = {
      foo: new Ref('bar', 'YAMLTag')
    };
    expect(dump(input)).toEqual('foo: !Ref bar\n');
  });

  test('with Object style', () => {
    const input = {
      foo: new Ref('bar', 'Object')
    };
    expect(dump(input)).toEqual('foo:\n  Ref: bar\n');
  });
})
