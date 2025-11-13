# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [unreleased]

### Added
- agent:
  - Automatically discover latest Slurm REST API version supported by
    `slurmrestd` among the list of Slurm-web supported versions declared in
    configuration.
  - Add `/ping` route to get Slurm version version and discovered Slurm REST API
    version.
  - Add Slurm REST API versions chained adapters to translate responses from
    older supported versions to the latest version of this API (#654).
  - Implement Slurm REST API adapter from v0.0.41 to v0.0.42.
  - Implement Slurm REST API adapter from v0.0.42 to v0.0.43.
- gateway: Add `/agent/{cluster}/ping` route to reverse-proxy request to agent
  `/ping` endpoint.
- connect: Discover and report latest Slurm REST API version supported by
  `slurmrestd` among the list of Slurm-web supported versions declared in
  configuration.
- conf: Introduce `[slurmrestd]` > `versions` parameter with list of all
  supported Slurm REST API versions.

### Changed
- front:
  - Get Slurm version with ping endpoint in clusters list before getting
    cluster stats if permitted.
  - Adapt individual job and qos typed interfaces to match new format exported
    by Slurm REST API v0.0.42.
- agent:
  - Consider HTTP/500 and specific error message as
    SlurmrestdAuthenticationError as a workaround for a regression in
    Slurm 25.11.0.
  - Remove Slurm version from `/stats` response.
- conf:
  - Deprecate `[slurmrestd]` > `version` parameter in favor of
    `[slurmrestd]` > `versions` parameter.
  - Replace `exclusive` by `shared` in filtered fields of individual job
    responses from Slurm controler for compatibility with v0.0.42 REST API.
  - Replace `standard_{error,input,output}` by `{stderr,stdin,stdout}_expanded`
    in filtered fields of individual job responses from Slurm controler for
    compatibility with v0.0.43 REST API.

### Fixed
- gateway: Use agent provided version instead of agent minimal version from
  settings to reverse proxy the requests (#656).

## [5.2.0] - 2025-11-03

### Added
- front:
  - Support filtering jobs in _failed_ state (#611).
  - Add button to reset cache statistics in settings cache tab (#603).
  - Dedicated route to directly access fullscreen view of resources diagram
    instead of modal requiring clicks (#631).
  - Display spinner while loading jobs running in node details page and display
    error when unable to load jobs.
  - Introduce new fullscreen cluster graphical representions with cores
    allocations rates (#293).
  - Add shimmering effect on nodes graphical representations while loading
    their states from Slurm.
  - Add possibility to display nodes names in clusters graphical representations
    when enough room for text label (#644).
  - Add general setting to control display of nodes names in clusters graphical
    representations, enabled by default.
- gateway: Add `/agent/{cluster}/cache/reset` route to reverse proxy request to
  agent `/cache/reset`.
- agent: Add `/cache/reset` route to reset cache statistics.
- conf:
  - Introduce `cache-reset` authorization action.
  - Assign `cache-reset` action to _user_ role (all authenticated users) in
    default authorization policy.
- docs:
  - Mention support of Debian 14 _« forky »_.
  - Add _Deployment_ section in architecture page to explain where packages must
    be installed with different topologies (#483).
  - Mention cores allocations graphical representation in overview page.

### Changed
- Change license from GPLv3+ to MIT.
- front: _Back to resources_ button in node details page redirects to the
  original resources view (eg. nodes diagram) instead of resources page
  consistently.
- docs:
  - Simplify distribution schema in architecture page to avoid confusion of
    frontend component on users host.
  - Update screenshots in quickstart guide to reflect latest UI updates.
  - Update authorization policy reference documentation.

### Fixed
- agent:
  - Handle `SlurmrestdAuthenticationError` in metrics endpoint (#623).
  - Fix failure of metrics endpoint when `cache-hit-total` or
    `cache-miss-total` keys are missing in Redis cache (#622).
- front:
  - Round allocated resources percentages with one decimal in node details page.
  - Fix centering of node tooltip over the racks graphical representation.
  - Restore expected view after authentication error (eg. missing or expired
    token) and successful login.
  - Update dependencies to fix CVE-2025-7783 (form-data), CVE-2025-58751,
    CVE-2025-58752 and CVE-2025-62522 (vite), CVE-2025-58754 (axios),
    GHSA-xffm-g5w8-qvg7 (eslint).
  - Handling of cache hit rate calculation when total number of requests in
    cache statistics is 0.
  - Adjust colors of nodes graphical representation to match more cores
    graphical representation.
- docs: Fix entreprise→enterprise typo.

## [5.1.0] - 2025-07-09

### Added
- gateway:
  - Support loading LDAP bind password from separate file (#585). Contribution
    from @Cornelicorn.
  - Add cache boolean in `/clusters` response to indicate whether cache service
    is enabled on agents.
  - Add `/agent/{cluster}/cache/stats` route to reverse proxy request to agent
    `/cache/stats`.
- agent:
  - Record slurmrestd cache hit and miss counts in cache service.
  - Add metrics with cache hit and miss counts.
  - Support querying cache metrics.
  - Add cache boolean in `/info` endpoint to indicate whether cache service is
    enabled on agent.
  - Add `/cache/stats` route to retrieve cache statistics.
- ldap-check: Support loading LDAP bind password from separate file.
  Contribution from @Cornelicorn.
- conf:
  - Add gateway `[ldap]` > `bind_password_file` configuration parameter.
    Contribution from @Cornelicorn.
  - Add gateway `[ldap]` > `lookup_as_user` configuration parameter.
    Contribution from @Cornelicorn.
  - Introduce `cache-view` authorization action.
  - Assign `cache-view` action to _user_ role (all authenticated users) in
    default authorization policy.

### Changed
- gateway:
  - Check agent version is greater or equal to the minimal supported version
    specified in gateway configuration settings.
  - Send asynchronous HTTP requests to discover agents (#438).
  - After successful user authentication, when service bind dn and password
    are defined in configuration, Slurm-web now retrieves user information
    and user groups in LDAP with these credentials by default. Previous behavior
    can be restored by setting `lookup_as_user = yes` under the `[ldap]` section
    in gateway configuration file (#587). Contribution from @Cornelicorn.
- agent:
  - Change route to information endpoint from `/v{version}/info` to `/info`.
  - Return version of agent in information endpoint.
  - Emit warning log entry when `SlurmwebMetricsDBError` is raised before
    responding HTTP/500.
- conf: Update description of `agent` > `version` gateway parameter to describe
  its new semantic.
- pkgs:
  - Set Python _requests_ external library dependency on agent only.
  - Bump minimal version of `RFL.authentication` to v1.5.0.
  - Move Python _aiohttp_ external library dependency from gateway extra package
    to main package because it is also a dependency of the agent now.
- docs:
  - Update authorization policy reference documentation.
  - Update configuration reference documentation.
  - Mention cache metrics in metrics configuration reference documentation.

### Fixed
- gateway: Handle content type error when expecting JSON response from agent.
- agent: Return HTTP/501 instead of crashing when metrics are requested but
  metrics service is disabled.
- front:
  - Handling of GPU declared without model in Slurm configuration (#584).
    Contribution from @mehalter.
  - Regression on handling of denied clusters in cluster list.
  - Parsing of GRES GPUs when comma is present between brackets with indexes or
    sockets. Contribution from @astappiev.
  - Fix color of ring in clusters list in dark mode.
  - Update dependencies to fix CVE-2025-5889 (brace-expansion).
- docs: Fix rendering of example list values in generated configuration
  reference documentation (#599).

## [5.0.0] - 2025-05-27

### Added
- Support Slurm 25.05 and Slurm REST API v0.0.41 (#541).
- GPU resources utilization monitoring (#258).
- frontend:
  - Dark mode support (#278).
  - Display cluster total memory size and number of GPUs in dashboard stats.
  - Display number of GPUs per node in resources page and node details
    page.
  - Display number of allocated GPU and allocation percentage in node details
    page.
  - Display number of GPU requested or allocated in jobs list.
  - Display number of GPU requested and allocated in job details page.
  - Add buttons to display GPU status metrics in dashboard.
  - Reproduce Slurm job status logic for jobs badges (#404).
  - Reproduce Slurm node status logic for node status and allocation badges with
    icons to represent status flags (#405).
  - Add node filter for _error_ and _fail_ states.
  - Display version in below logo in main menu (#568).
  - Display _suspended_, _preempted_, _deadline_, _node fail_, _boot fail_,
    _out of memory_ jobs in dashboard chart.
  - Display _fail_ and _error_ nodes in dashboar chart.
- agent:
  - Add total quantity of memory and number of gpus in cluster stats response.
  - Add metrics for GPU by state and total number of GPU.
  - Support querying GPU metrics.
  - Add missing jobs base states in collected metrics: `SUSPENDED`, `PREEMPTED`,
    `NODE_FAIL`, `BOOT_FAIL`, `DEADLINE` and `OUT_OF_MEMORY`.
  - Add `ERROR` and `FAIL` node states in collected metrics.
- gateway: Add version in configuration file generated for frontend component.
- conf:
  - Select `gres` and `gres_used` attributes by default in `slurmrestd` nodes
    list and indiviual node responses.
  - Select `gres_detail`, `sockets_per_node`, `tasks`, `tres_per_job`,
    `tres_per_node`, `tres_per_socket`, `tres_per_task` attributes by default in
    `slurmrestd` jobs list and Slurm controller invidual job responses.
- docs:
  - Mention support of Fedora 42.
  - Mention GPU support feature in overview page.
  - Mention GPU metrics in metrics configuration reference documentation.
  - Mention dark mode support feature in overview page.
  - Mention new `--with-slurm` option in `slurm-web-gen-jwt-key` manpage.
  - Add update guide page with special notes for manual steps required to update
    from v4 to v5.

### Changed
- agent:
  - Run agent as _slurm-web_ system user by default.
  - Emit warning log entry at launch when slurmrestd local authentication method
    is used.
- frontend:
  - Migrate to Tailwind CSS v4 (#449). Note this breaks support of old browsers
    versions, it requires Safari 16.4+, Chrome 111+, and Firefox 128+.
  - Convert nodes memory size in GB or TB in resources page and node details
    page.
  - Appearance of jobs sort button to visually separate its double role, change
    sort order and select sort criterion.
  - Bump heroicons dependency to version 2.2.0.
  - Group _drain_ and _draining_ node state filters.
- genjwt: Give ownership of Slurm-web JWT signing key to _slurm-web_ system user
  only by default. Read ACL is added for _slurm_ system user only if
  `--with-slurm` option is provided explicitely.
- connect: Emit warning log entry when slurmrestd local authentication method is
  used.
- ldap-check: Return exit code 1 on LDAP authentication error.
- conf:
  - Bump `[slurmrestd]` > `version` default value from `0.0.40` to `0.0.41` in
    agent configuration for compatibility with Slurm 25.05.
  - Change default value of `[slurmrestd]` > `auth` agent parameter from `local`
    to `jwt`.
- docs:
  - Replace mention of Slurm REST API version v0.0.40 by v0.0.41.
  - Mention requirement of Slurm >= 24.05 and dropped support of Slurm 23.11.
  - Update quickstart guide to setup `slurmrestd` JWT authentication, automatic
    token management mode on Unix socket by default.
  - Update installation guide and quickstart guide to mention new separate
    `slurmweb-5` repository.
  - Update troubleshooting guide with different `curl` command for `slurmrestd`
    JWT authentication and TCP/IP socket.
  - Mention `slurmrestd` local authentication is deprecated in architecture
    and `slurmrestd` configuration pages.
  - Update `slurmrestd` configuration guides to reflect change to _jwt_
    authentication method by default.
  - Update configuration reference documentation.

### Fixed
- agent: Fix `AttributeError` with `prometheus_client.registry.Collector` on el8
  (#548).
- frontend:
  - Rendering of nodes grid in resources page in presence of long node names.
  - Update dependencies to fix CVE-2025-46565 (vite).
- ldap-check: Report and return error instead of crashing when LDAP URI is not
  defined in configuration.

### Removed
- Drop support of Slurm 23.11 and Slurm REST API v0.0.40.
- docs: Drop support of Fedora 40.

## [4.2.0] - 2025-04-29

### Added
- Add `--log-component` option on every commands to prefix all log entries with
  a component name.
- Introduce `slurm-web-connect-check` utility to test access to `slurmrestd`
  service with agent configuration parameters.
- frontend:
  - Add possibility to sort jobs by quantity of resources (#453).
  - Add priority in jobs list (#452).
  - Disable racks and rows labels in RacksDB infrastructure graphical
    representations by default (#461). These labels can be restored with
    `[ui]` > `racksdb_{rows,racks}_labels` gateway parameters.
- gateway: Add `RACKSDB_{ROWS,RACKS}_LABELS` in configuration file generated for
  frontend component.
- conf:
  - Introduce `[ui]` > `racksdb_{rows,racks}_labels` gateway parameters.
  - Introduce `[slurmrestd]` > `auth`, `jwt_mode`, `jwt_user`, `jwt_lifespan`,
    `jwt_key` and `jwt_token` agent parameters.
- agent:
 - Support JWT authentication on `slurmrestd` in _static_ and _auto_ modes.
 - Support access to `slurmrestd` on TCP/IP socket (#313).
- docs:
  - Mention `--log-component` option in manpages.
  - Add manpage for `slurm-web-connect-check` utility.
  - Add _Slurmrestd Access_ page with guides to setup Slurm and agent in all
    supported configurations.
  - Mention support of JWT authentication and TCP/IP sockets between agent and
    Slurm `slurmrestd` in _Protocols_ section of Architecture page and
    Quickstart guide.
- lib: Add comment in agent native and uWSGI services units to explain
  possibility to drop privileges of _slurm_ user in favor of more restricted
  _slurm-web_ user with `slurmrestd` JWT authentication.

### Changed
- conf: Deprecate `[slurmrestd]` > `socket` parameter in favor of `uri` designed
  to support TCP/IP socket.
- frontend: Replace _view_ job link by a window icon in jobs list.
- lib: Rename sysusers configuration file `slurm-web-gateway.conf` to
  `slurm-web.conf` in order to make it generic for both gateway and agent.
- pkgs:
  - Add dependency on `importlib_metadata` external library on Python < 3.8.
  - Bump minimal version of `RFL.log` to v1.4.0.
  - Bump minimal version of `RFL.settings` to v1.4.0.
  - Bump minimal version of `RFL.authentication` to v1.4.0.
- docs: Update configuration reference documentation.

### Fixed
- Fix _DeprecationWarning_ with setuptools `pkg_resources` being used as an API.
- Fix handling of generic Python exceptions in registered error handler with
  Flask < 1.1.0 to return JSON description of this exception (#497).
- gateway: Add support of strings in RacksDB/agent version parts comparison
  logic.
- frontend:
  - Missing bearer token in RacksDB infrastructure diagram request (#471).
  - Responsive layout in jobs view by removing some columns on smaller screens.
  - Do not display canceled request errors (#507).
  - Update dependencies to fix CVE-2025-24964 (vitest), CVE-2025-27152 (axios)
    CVE-2025-30208, CVE-2025-31125, CVE-2025-31486, CVE-2025-32395 (vite) and
    GHSA-67mh-4wv8-2f99 (esbuild).

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
    LDAP directory by default (#446,#447→#464). This can be reverted to the
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
  - Add `ldap` > `user_name_attribute` parameter for the gateway.
  - Add `ui` > `hide_denied` parameter for the gateway.

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

[unreleased]: https://github.com/rackslab/Slurm-web/compare/v5.2.0...HEAD
[5.2.0]: https://github.com/rackslab/Slurm-web/releases/tag/v5.2.0
[5.1.0]: https://github.com/rackslab/Slurm-web/releases/tag/v5.1.0
[5.0.0]: https://github.com/rackslab/Slurm-web/releases/tag/v5.0.0
[4.2.0]: https://github.com/rackslab/Slurm-web/releases/tag/v4.2.0
[4.1.0]: https://github.com/rackslab/Slurm-web/releases/tag/v4.1.0
[4.0.0]: https://github.com/rackslab/Slurm-web/releases/tag/v4.0.0
[3.3.0]: https://github.com/rackslab/Slurm-web/releases/tag/v3.3.0
[3.2.0]: https://github.com/rackslab/Slurm-web/releases/tag/v3.2.0
[3.1.0]: https://github.com/rackslab/Slurm-web/releases/tag/v3.1.0
[3.0.0]: https://github.com/rackslab/Slurm-web/releases/tag/v3.0.0
