# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [unreleased]

### Added
- agent:
  - Return RacksDB infrastructure name and a boolean to indicate if metrics
    feature is enabled in `/info` endpoint, in addition to the cluster name.
  - Add optional `/metrics` endpoint with various Slurm metrics in OpenMetrics
    format designed to be scraped by Prometheus or compatible (#274).
  - Add possibility to query metrics from Prometheus database with
    `/v<version>/metrics/<metric>` endpoint.
  - Add possibility to filter jobs which are allocated a specific node with node
    query parameter on `/v<version>/jobs` endpoint.
- gateway:
  - Return RacksDB infrastructure name and boolean metrics feature flag of every
    clusters in `/clusters` endpoint.
  - Return optional markdown login service message as rendered HTML page with
    `/messages/login` endpoint.
  - Proxy metrics requests to agent through
    `/api/agents/<cluster>/metrics/<metric>` endpoint.
- frontend:
  - Request RacksDB with the infrastructure name provided by the gateway (#348).
  - Display time limit of running jobs in job details page (#352).
  - Display service message below login form if defined (#253).
  - Add dependency on _charts.js_ and _luxon_ adapter to draw charts with
    timeseries metrics.
  - Display charts of resources (nodes/cores) status and jobs queue in dashboard
    page based on metrics from Prometheus (#275).
  - Display list of jobs which have resources allocated on the node in node
    details page (#292).
  - Display hash near all jobs fields in job details page to generate link to
    highlight specific field (#251).
- conf:
  - Add `racksdb` > `infrastructure` parameter for the agent.
  - Add `metrics` > `enabled` parameter for the agent.
  - Add `metrics` > `restrict` parameter for the agent.
  - Add `metrics` > `host` parameter for the agent.
  - Add `metrics` > `job` parameter for the agent.
  - Add `ui` > `templates`, `message_template`, `message_login` parameters for
    the gateway.
  - Select `alloc_cpus` and `alloc_idle_cpus` nodes fields on `slurmrestd`
    `/slurm/*/nodes` and `/slurm/*/node/<node>` endpoints.
  - Select `nodes` jobs field on `slurmrestd` `/slurm/*/jobs` endpoint.
  - Introduce service message template.
- show-conf: Introduce `slurm-web-show-conf` utility to dump current
  configuration settings of gateway and agent components with their origin,
  which can either be configuration definition file or site override (#349).
- docs:
  - Add manpage for `slurm-web-show-conf` command.
  - Add metrics feature configuration documentation page.
  - Mention metrics optional feature in quickstart guide.
  - Mention metrics export and charts feature in overview page.
  - Mention possible Prometheus integration in architecture page.
  - Mention login service message feature in overview page.
  - Add page to document _Service Messages_ configuration.
- pkgs:
  - Introduce `gateway` Python extra package.
  - Add requirement on markdown external library for `gateway` extra package.

### Changed
- gateway: Change error message when unable to parse agent info fields.
- docs:
  - Update configuration reference documentation.
  - Update dashboard screenshot in overview page with example of resource chart.
- conf:
  - Convert `[cache]` > `password` agent parameter from string to password type.
  - Convert `[ldap]` > `bind_password` gateway parameter from string to password
    type.
  - Bump `[slurmrestd]` > `version` default value from `0.0.39` to `0.0.40` in
    agent configuration for compatibility with Slurm 24.11.
- pkgs:
  - Add requirement on RFL.core >= 1.1.0.
  - Add requirement on RFL.settings >= 1.1.1.
  - Add dependency on prometheus-client for the agent.
  - Add direct dependency on ClusterShell for the agent.

### Fixed
- agent:
  - Fix retrieval of terminated jobs only available in accounting service with
    an option to ignore 404 for specific slurmrestd requests.
  - Fix compatibility issue with Requests >= 2.32.2 (#350).
  - Return HTTP/404 not found with meaningful error message when requesting
    unexisting node.
- gateway:
  - Catch generic `requests.exceptions.RequestException` when retrieving
    information from agents to avoid `AttributeError` with more specific
    exceptions on old versions on _Requests_ library (#391).
  - Catch `JSONDecodeError` from _simpleson_ external library and _json_
    standard library module not managed by Requests < 2.27.
- frontend:
  - Notifications not visible when browser is not at the top (#367).
  - Update dependencies to fix CVE-2024-45812 and CVE-2024-45811 (vite),
    CVE-2024-47068 (rollup), CVE-2024-21538 (cross-spawn).

### Removed
- conf:
  - Remove unused `required` from default selected jobs field on `slurmrestd`
    `/slurm/*/jobs` endpoint.
  - Remove unused `state_reason` from default selected job field on `slurmrestd`
    `/slurm/*/job/<id>` endpoint.

## [3.2.0] - 2024-09-05

### Added
- gateway: Support custom LDAP user primary group attribute and group object
  classes (#342).
- agent: Retrieve Slurm version from `slurmrestd` REST API and return value in
  response of `stats` endpoint.
- frontend: Display Slurm version in clusters list (#314).
- ldap-check: Support custom LDAP user primary group attribute and group object
  classes (#342).
- conf:
  - Add `ldap` > `user_primary_group_attribute` parameter for the gateway.
  - Add `ldap` > `group_object_classes` parameter for the gateway.
  - Add `cache` > `version` parameter for the agent.
- docs:
  - Add link to related github issue for `slurmrestd` TCP/IP socket limitation
    in architecture page.
  - Add warning about the pure documentation purpose of complete examples of
    gateway/agent configuration files.
  - Explain `[slurmrestd]` > `version` agent setting is more intended for
    developers and should not be changed.
  - Mention Slurm accounting is required in quickstart guide (#341).

### Changed
- agent: Check Slurm version returned from `slurmrestd` against hard-coded
  minimal version and log error if not greater or equal.
- frontend: Add intermediate cluster list width to 80% on large screens, before
  going down to 60% on even larger screens.
- pkgs: Add requirement on RFL.core and RFL.authentication >= 1.0.3.
- docs:
  - Update configuration reference documentation.
  - Update screenshots with latest UI changes.

### Fixed
- backend: handle `rfl.settings.errors.SettingsSiteLoaderError` when loading
  gateway and agent site configuration (#317).
- gateway: Response with HTTP/501 and JSON error when requesting users with
  authentication disabled.
- agent:
  - Translate HTTP/404 from slurmrestd into JSON error agent that can be
    interpreted by frontend and emit clear error message in logs (#321).
  - Detect responses from slurmrestd not formatted in JSON, translated into JSON
    error for frontend and emit clear error message in logs (#333).
  - Detect absence of _warnings_ key in `slurmrestd` responses and emit warning
    log instead of crashing (#316).
- genjwt: fix portability to Python < 3.8 in debug message.
- ldap-check: fix usage of `user_name_attribute` configuration parameter (#340).
- frontend:
  - Support node names without digits in expand/fold logic (#328).
  - Update dependencies to fix CVE-2024-39338 (axios),
    CVE-2024-6783 (vue-template-compiler) and CVE-2024-4067 (micromatch).
  - Display empty list of users/account with light gray cross instead of dot in
    reservations page (#336).
  - Hide users disclosure from jobs filters panel when authentication is
    disabled (#330).
- docs:
  - Mention requirement of `SLURMRESTD_SECURITY=disable_user_check` environment
    variable in `slurmrestd` service drop-in configuration override (#320).
  - Fix protocols section in architecture page to mention Slurm internal
    authentication mechanism (with `sackd`) and clarify that `munge` is not
    involved between Slurm-web agent and `slurmrestd`.

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

[unreleased]: https://github.com/rackslab/Slurm-web/compare/v3.2.0...HEAD
[3.2.0]: https://github.com/rackslab/Slurm-web/releases/tag/v3.2.0
[3.1.0]: https://github.com/rackslab/Slurm-web/releases/tag/v3.1.0
[3.0.0]: https://github.com/rackslab/Slurm-web/releases/tag/v3.0.0
