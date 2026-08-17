import { describe, expect, it, vi } from 'vitest';
import {
  InvalidComponentError,
  InvalidConfigError,
  InvalidPathError,
  InvalidResourceError,
  InvalidSubResourceError,
  MissingPathVariableError,
  ReactLayoutError,
} from '../../src/errors';

describe('React Layout errors', () => {
  it('creates an invalid configuration error', () => {
    const error = new InvalidConfigError({
      reason: 'A paths definition is required',
      config: {},
    });

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ReactLayoutError);
    expect(error.name).toBe('InvalidConfigError');
    expect(error.code).toBe('invalidConfig');
    expect(error.scope).toBe('config');
    expect(error.message).toContain('paths definition is required');
  });

  it('creates an invalid path error with available paths', () => {
    const error = new InvalidPathError({
      path: '/settings',
      validPaths: ['/home', '/profile'],
      reason: 'The path is not registered.',
    });

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ReactLayoutError);
    expect(error.name).toBe('InvalidPathError');
    expect(error.code).toBe('invalidPath');
    expect(error.scope).toBe('path');
    expect(error.message).toContain('"/settings"');
    expect(error.message).toContain('/home');
    expect(error.message).toContain('/profile');
  });

  it('creates an invalid resource error with available resources', () => {
    const error = new InvalidResourceError({
      resource: 'accounts',
      validResources: ['users', 'teams'],
    });

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ReactLayoutError);
    expect(error.name).toBe('InvalidResourceError');
    expect(error.code).toBe('invalidResource');
    expect(error.scope).toBe('resource');
    expect(error.message).toContain('"accounts"');
    expect(error.message).toContain('users');
    expect(error.message).toContain('teams');
  });

  it('creates an invalid sub-resource error with its owner', () => {
    const error = new InvalidSubResourceError({
      subResource: 'members',
      resource: 'teams',
      validSubResources: ['settings', 'permissions'],
    });

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ReactLayoutError);
    expect(error.name).toBe('InvalidSubResourceError');
    expect(error.code).toBe('invalidSubResource');
    expect(error.scope).toBe('subResource');
    expect(error.message).toContain('"members"');
    expect(error.message).toContain('"teams"');
    expect(error.message).toContain('settings');
  });

  it('creates an invalid component error that prefers its reason', () => {
    const error = new InvalidComponentError({
      component: 'sidebar',
      path: '/dashboard',
      resource: 'users',
      validComponents: ['header', 'content'],
      reason: 'The sidebar export is not a React component.',
    });

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ReactLayoutError);
    expect(error.name).toBe('InvalidComponentError');
    expect(error.code).toBe('invalidComponent');
    expect(error.scope).toBe('component');
    expect(error.message).toContain('sidebar export');
    expect(error.message).toContain('header');
  });

  it('describes an unconfigured component slot and its location', () => {
    const error = new InvalidComponentError({
      component: 'footer',
      path: '/dashboard',
      resource: 'users',
    });

    expect(error.message).toContain('"footer"');
    expect(error.message).toContain('"/dashboard"');
    expect(error.message).toContain('"users"');
  });

  it('creates a missing path variable error', () => {
    const error = new MissingPathVariableError({
      variable: 'userId',
      path: '/users/$userId',
      providedVariables: ['teamId'],
    });

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ReactLayoutError);
    expect(error.name).toBe('MissingPathVariableError');
    expect(error.code).toBe('missingPathVariable');
    expect(error.scope).toBe('pathVariable');
    expect(error.message).toContain('$userId');
    expect(error.message).toContain('/users/$userId');
    expect(error.message).toContain('$teamId');
  });

  it('uses a custom renderer with the error scope and context', () => {
    const error = new InvalidConfigError({
      reason: 'Missing resources',
      config: { resources: [] },
    });
    const renderer = vi.fn(
      (scope: 'config', context: typeof error.context) =>
        `${scope}: ${context.reason}`,
    );

    expect(error.renderMessage(renderer)).toBe('config: Missing resources');
    expect(renderer).toHaveBeenCalledWith('config', {
      reason: 'Missing resources',
      config: { resources: [] },
      scope: 'config',
    });
  });

  it('serializes its data and makes nested context JSON-safe', () => {
    const error = new InvalidConfigError({
      reason: 'Nested configuration is invalid',
      config: {
        fallback: undefined,
        entries: [{ value: 'header' }, undefined],
      },
    });

    expect(error.toJSON()).toEqual({
      name: 'InvalidConfigError',
      code: 'invalidConfig',
      scope: 'config',
      message: error.message,
      context: {
        reason: 'Nested configuration is invalid',
        config: {
          fallback: null,
          entries: [{ value: 'header' }, null],
        },
        scope: 'config',
      },
    });
  });

  it('does not throw when an invariant condition is truthy', () => {
    expect(() =>
      InvalidPathError.invariant(true, {
        path: '/home',
      }),
    ).not.toThrow();
  });

  it('throws its concrete error when an invariant condition is falsy', () => {
    expect(() =>
      InvalidResourceError.invariant(false, {
        resource: 'accounts',
      }),
    ).toThrow(InvalidResourceError);
  });

  it('resolves lazy invariant context only when the condition is falsy', () => {
    const context = vi.fn(() => ({
      variable: 'userId',
      path: '/users/$userId',
    }));

    expect(() => MissingPathVariableError.invariant(true, context)).not.toThrow();
    expect(context).not.toHaveBeenCalled();

    expect(() => MissingPathVariableError.invariant(false, context)).toThrow(
      MissingPathVariableError,
    );
    expect(context).toHaveBeenCalledOnce();
  });

  it('narrows values after a successful invariant assertion', () => {
    function requirePath(value: string | undefined) {
      InvalidPathError.invariant(value, {
        path: value,
        reason: 'A path is required.',
      });

      return value.toUpperCase();
    }

    expect(requirePath('/home')).toBe('/HOME');
  });
});
