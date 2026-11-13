import type { LoggerOptions } from 'pino';

// Shape of the JSON log lines written when JSON_LOGS is set (production).
//
// Pino's defaults write a numeric level ("level":50) and put the text under
// "msg", which none of the Voltti log alerting can see:
// - The CloudWatch error scan for pino services keeps lines whose "level",
//   lowercased, equals "error", and shows the "message" field.
// - The Elastic watcher alerts on lines whose "logLevel" is exactly "ERROR",
//   or whose "message" field contains "error" or "exception". The ingest
//   pipeline lifts the JSON fields to the top level as they are; it does not
//   rename "msg".
// So every line carries the level as a string under both names and the text
// under "message", like the Voltti api-gateways' pino setup. This also applies
// to Nest's own error logs, such as unhandled exceptions, and to pino-http's
// request lines (which stay at info level, also for a 5xx response).
export const pinoLoggerOptions: LoggerOptions = {
  messageKey: 'message',
  formatters: {
    level: (label) => ({ level: label, logLevel: label.toUpperCase() }),
  },
};
