# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [unrelead]

### Added
- docs: Add link to related github issue for `slurmrestd` TCP/IP socket
  limitation in architecture page.

## [3.1.0] - 2024-07-03

### Added
- frontend:
  - Display job priority in job details page (#300).
  - Display requested resources in jobs list (#297).
- gateway:
  - Retrieve list of clusters permissions and stats in parallel with
    asynchronous requests (#304).
  - Add possibility to hide the list of denied clusters on which users do not
    have any permission (#296).
- agent: Add `cpus` and `node_count` fields as provided by `slurmrestd` in jobs
  list responses.
- docs: Add full gateway and agent configuration files examples.
- conf:
  - Add `ldap`>`user_name_attribute` parameter for the gateway.
  - Add `ui`>`hide_denied` parameter for the gateway.

### Changed
- frontend:
  - Use server icon instead of cpu chip icon to represent nodes in clusters list
    and clusters pop over menu.
  - Merge account column with user column in jobs list, the account is now
    displayed between parenthesis.
- docs: Update configuration reference documentation.
- pkgs:
  - Add requirement on RFL >= 1.0.2.
  - Add requirement on _aiohttp_.

### Fixed
- frontend:
  - Support expansion and folding of nodesets with multiple digits and arbitrary
    suffixes (#302).
  - Handle jobs cancelled state with specific badge color (#295).
- gateway: Add possibility to configure custom LDAP user name attribute in
  alternative to `uid` (#305).
- conf: Add documentation precisions and examples in agent and gateway
  configuration definitions.
- docs:
  - Typo in slurmrestd service name in quick start guide.
  - Use consistent URL format for `curl` commands on `slurmrestd` Unix sockets.
  - Fix agent and gateway configuration file extension in configuration files
    reference documentation.
  - Fix some agent and gateway configuration file extension typos in quickstart
    guide.
  - Invert initial setup and JWT signing key sections in quickstart to satisfy
    `slurm-web-gen-jwt-key` configuration requirement.

## [3.0.0] - 2024-05-13

[unreleased]: https://github.com/rackslab/Slurm-web/compare/v3.1.0...HEAD
[3.1.0]: https://github.com/rackslab/Slurm-web/releases/tag/v3.1.0
[3.0.0]: https://github.com/rackslab/Slurm-web/releases/tag/v3.0.0
