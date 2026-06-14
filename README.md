# jenktrace

jenktrace is a desktop app for monitoring Jenkins jobs from a focused local workspace. It lets you keep multiple Jenkins instances, tracked jobs, recent build activity, and build health in one place without living in the browser all day.

## What It Does

- Connect to multiple Jenkins instances from one app.
- Save and manage monitored jobs, including nested Jenkins folder paths.
- Review recent build activity, job details, and time-range analytics.
- Inspect build logs that are cached locally for faster follow-up checks.
- Run background monitoring cycles so job changes continue to be observed over time.

## Why Use It

- Faster context switching than bouncing between multiple Jenkins tabs.
- Local persistence for instances, jobs, analytics data, and cached logs.
- Desktop workflow for operators and developers who need to watch job health continuously.
- Built-in connection testing and SSL fallback controls for harder enterprise Jenkins setups.

## Platform Notes

- macOS packaged builds use the system trust store for Jenkins HTTPS requests.
- Jenkins endpoints with self-signed or otherwise untrusted certificates can still use the per-instance `Disable SSL verification` option when needed.

## Releases

Release notes live in [docs/release-notes](/Users/dustni/workspace/jenktrace/docs/release-notes).

Current published notes:

- [v1.0.10](/Users/dustni/workspace/jenktrace/docs/release-notes/v1.0.10.md)
- [v1.0.9](/Users/dustni/workspace/jenktrace/docs/release-notes/v1.0.9.md)
- [v1.0.8](/Users/dustni/workspace/jenktrace/docs/release-notes/v1.0.8.md)
- [v1.0.7](/Users/dustni/workspace/jenktrace/docs/release-notes/v1.0.7.md)
- [v1.0.6](/Users/dustni/workspace/jenktrace/docs/release-notes/v1.0.6.md)
- [v1.0.5](/Users/dustni/workspace/jenktrace/docs/release-notes/v1.0.5.md)
- [v1.0.4](/Users/dustni/workspace/jenktrace/docs/release-notes/v1.0.4.md)
- [v1.0.3](/Users/dustni/workspace/jenktrace/docs/release-notes/v1.0.3.md)
- [v1.0.2](/Users/dustni/workspace/jenktrace/docs/release-notes/v1.0.2.md)
- [v1.0.1](/Users/dustni/workspace/jenktrace/docs/release-notes/v1.0.1.md)
- [v1.0.0](/Users/dustni/workspace/jenktrace/docs/release-notes/v1.0.0.md)
