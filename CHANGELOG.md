# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.1.0] - 2025-02-05

### Added
- agent: Return local RacksDB enabled boolean and version in `/info` endpoint.
- gateway: Return RacksDB enabled boolean feature flag of every clusters in
  `/clusters` endpoint.
- conf:
  - Add `racksdb` > `enabled` parameter for the agent.
  - Add `ldap` > `lookup_user_dn` parameter for the gateway.

### Changed
- gateway:
  - Check RacksDB version executed by agent is greater or equal to the minimal
    supported version specified in gateway configuration settings (#415→#417).
  - Do not return clusters global stats in `/clusters` endpoint anymore.
  - Lookup user DN in the scope of user base subtree before authentication on
    LDAP directory by default (#446,447→464). This can be reverted to the
    previous behavior by setting `lookup_user_dn=no` in `[ldap]` section of the
    gateway configuration.
- agent:
  - Skip registering of RacksDB API endpoints when disabled (#440).
  - Report error in logs instead of failing with critical error when unable to
    load RacksDB database (#458).
- frontend:
  - Reduce height of error message container when unable to retrieve
    infrastructure graphical representation from RacksDB in resources page.
  - Do not display infrastructure advanced graphical representation canvas in
    resources page when RacksDB is disabled in agent configuration for a
    cluster (#418→#434).
  - Retrieve clusters stats asynchronously after the clusters list with
    their permissions (#428→#435).
  - Bump Vue.js to version 3.5.13 (#397→#450).
- conf: Update description of `agent` > `racksdb_version` to describe its new
  semantic.
- docs:
  - Explain RacksDB is now optional in quickstart guide, with method to disable
    integration feature in side note, and in overview and architecture pages.
  - Update configuration reference documentation.

### Fixed
- backend: Remove `en_US.UTF-8` locale requirement for uwsgi services
  (#432→#463).
- agent: Fix No module named 'werkzeug.middleware' ModuleNotFoundError with
  Werkzeug < 0.15 (#419→420).
- frontend:
  - Do not show fullscreen button on thumbnail when unable to retrieve
    infrastructure graphical representation from RacksDB.
  - Restore infrastructure graphical representation canvas on cluster change in
    resources page when coming from cluster on which RacksDB failed.
  - Reduce size of JS chunk by moving _chart.js_ and _luxon_ libraries in
    separate _vendor_ chunk (#414→#441).
  - Remove workaround for Firefox to avoid blurry lines in racks canvas, fixed
    in Firefox ESR >= 128 and Firefox >= 133 (#443).
  - Do not report ongoing issue when users do not have permission on
    `view-stats` action on a cluster in clusters list page.
  - Remove old values from dashboard timeseries charts only if their associated
    timestamps is older than the new suggested minimal timestamp on update
    (#454→#466).
  - Update dependencies to fix CVE-2024-55565 (nanoid) and CVE-2025-24010
    (vite).
- pkgs: Bump dependency to RFL.web 1.3.0 to fix access to restricted endpoints
  with anonymous token or no token (#460,#462→#461).
- docs: Fix cp command to copy examples of uWSGI services provided in Slurm-web
  packages (#448→#465).

## [4.0.0] - 2024-11-28

### Added
- Support Slurm 24.11 and Slurm REST API v0.0.40 (#366 → #400).
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
  - Represent terminated jobs with colored bullet in job status badge, using
    respectively green for completed (ie. successful) jobs, red for failed jobs
    and dark orange for timeout jobs (#354).
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
  - Mention jobs badges to visualize job status in overview page.
  - Add page to document _Service Messages_ configuration.
  - Mention support of Fedora 41.
- pkgs:
  - Introduce `gateway` Python extra package.
  - Add requirement on markdown external library for `gateway` extra package.
  - Add dependency on prometheus-client for the agent.
  - Add direct dependency on ClusterShell for the agent.

### Changed
- agent: Bump minimal required Slurm version from 23.02.0 to 23.11.0.
- gateway: Change error message when unable to parse agent info fields.
- docs:
  - Update configuration reference documentation.
  - Update dashboard screenshot in overview page with example of resource chart.
  - Replace mention of Slurm REST API version v0.0.39 by v0.0.40.
  - Mention requirement of Slurm >= 23.11 and dropped support of Slurm 23.02.
- conf:
  - Convert `[cache]` > `password` agent parameter from string to password type.
  - Convert `[ldap]` > `bind_password` gateway parameter from string to password
    type.
  - Bump `[slurmrestd]` > `version` default value from `0.0.39` to `0.0.40` in
    agent configuration for compatibility with Slurm 24.11.
- pkgs:
  - Add requirement on RFL.core >= 1.1.0.
  - Add requirement on RFL.settings >= 1.1.1.

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
- Support of Slurm 23.02 and Slurm REST API v0.0.39.
- conf:
  - Remove unused `required` from default selected jobs field on `slurmrestd`
    `/slurm/*/jobs` endpoint.
  - Remove unused `state_reason` from default selected job field on `slurmrestd`
    `/slurm/*/job/<id>` endpoint.
- docs: Remove mention of Fedora 39 support.

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

[unreleased]: https://github.com/rackslab/Slurm-web/compare/v4.1.0...HEAD
[4.1.0]: https://github.com/rackslab/Slurm-web/releases/tag/v4.1.0
[4.0.0]: https://github.com/rackslab/Slurm-web/releases/tag/v4.0.0
[3.2.0]: https://github.com/rackslab/Slurm-web/releases/tag/v3.2.0
[3.1.0]: https://github.com/rackslab/Slurm-web/releases/tag/v3.1.0
[3.0.0]: https://github.com/rackslab/Slurm-web/releases/tag/v3.0.0
