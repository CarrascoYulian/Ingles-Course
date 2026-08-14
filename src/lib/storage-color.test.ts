import { describe, expect, it } from 'vitest';

import { storageBarColor } from './storage-color';

describe('storageBarColor', () => {
  it('es azul sólido por debajo del umbral de advertencia', () => {
    expect(storageBarColor(0)).toBe('rgb(47, 107, 255)');
    expect(storageBarColor(40)).toBe('rgb(47, 107, 255)');
    expect(storageBarColor(65)).toBe('rgb(47, 107, 255)');
  });

  it('interpola azul a ámbar entre 65 y 90', () => {
    expect(storageBarColor(77.5)).toBe('rgb(146, 133, 133)');
  });

  it('es ámbar puro en el umbral crítico', () => {
    expect(storageBarColor(90)).toBe('rgb(245, 158, 11)');
  });

  it('interpola ámbar a rojo entre 90 y 100', () => {
    expect(storageBarColor(95)).toBe('rgb(233, 98, 25)');
  });

  it('es rojo puro en 100', () => {
    expect(storageBarColor(100)).toBe('rgb(220, 38, 38)');
  });

  it('aplasta valores fuera de rango a [0, 100]', () => {
    expect(storageBarColor(-10)).toBe(storageBarColor(0));
    expect(storageBarColor(150)).toBe(storageBarColor(100));
  });

  it('respeta umbrales personalizados', () => {
    expect(storageBarColor(50, { warningAt: 50, criticalAt: 80 })).toBe('rgb(47, 107, 255)');
  });
});
