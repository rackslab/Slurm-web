# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- frontend: Display job priority in job details page (#300).
- agent: Add `cpus` and `node_count` fields as provided by `slurmrestd` in jobs
  list responses.

### Changed
- frontend: Use server icon instead of cpu chip icon to represent nodes in
  clusters list and clusters pop over menu.

### Fixed
- docs:
  - Typo in slurmrestd service name in quick start guide.
  - Use consistent URL format for `curl` commands on `slurmrestd` Unix sockets.
  - Fix agent and gateway configuration file extension in configuration files
    reference documentation.
  - Fix some agent and gateway configuration file extension typos in quickstart
    guide.

## [3.0.0] - 2024-05-13

[unreleased]: https://github.com/rackslab/Slurm-web/compare/v3.0.0...HEAD
[3.0.0]: https://github.com/rackslab/Slurm-web/releases/tag/v3.0.0
