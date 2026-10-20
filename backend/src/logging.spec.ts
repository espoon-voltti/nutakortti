import pino, { LoggerOptions } from 'pino';
import { pinoLoggerOptions } from './logging';

function logLine(
  options: LoggerOptions,
  write: (logger: pino.Logger) => void,
): Record<string, unknown> {
  const lines: string[] = [];
  const logger = pino(options, { write: (line: string) => lines.push(line) });
  write(logger);
  expect(lines).toHaveLength(1);
  return JSON.parse(lines[0]);
}

describe('JSON log lines', () => {
  it('carry the level as a string and the text under "message"', () => {
    const line = logLine(pinoLoggerOptions, (logger) =>
      logger.error({ context: 'SSO Service' }, 'Suomi.fi logout failed'),
    );

    expect(line.level).toBe('error');
    expect(line.logLevel).toBe('ERROR');
    expect(line.message).toBe('Suomi.fi logout failed');
    expect(line).not.toHaveProperty('msg');
    expect(line.context).toBe('SSO Service');
  });

  it('label the other levels the same way', () => {
    const line = logLine(pinoLoggerOptions, (logger) => logger.warn('w'));

    expect(line.level).toBe('warn');
    expect(line.logLevel).toBe('WARN');
  });

  it('differ from the pino defaults, which the alerting cannot match', () => {
    const line = logLine({}, (logger) => logger.error('x'));

    expect(line.level).toBe(50);
    expect(line).not.toHaveProperty('logLevel');
    expect(line).not.toHaveProperty('message');
  });
});
