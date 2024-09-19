# External Contributions

[Rackslab](https://rackslab.io) accepts external community contributions from
the community on Slurm-web under some conditions.

In order to secure intellectual property on the project, contributors must
accept the [Rackslab Contributor License Agreement](https://rackslab.io/cla)
(CLA).

Rackslab has a clear commitment in terms of source code quality, usability and
maintainability towars its customers and users of its software. This means in
particular that, before inclusion of the contributions in a Slurm-web release,
Rackslab ensures that:

* It has the complete ability to autonomously test and validate the proposed
  change.
* The software documentation and changelog fully cover the proposed change,
  including functional and architectural changes, deployment and usage
  changes and new configuration options.
* The absence of impact on the service level of its customers.

Depending on the complexity of the contribution, this could represent a
significant amount of work for Rackslab staff. For this reason, Rackslab can
decide to charge a reasonable amount contributing organizations for inclusion of
external contributions.

# Code Conventions

## Python code

Python code in Slurm-web backend applications must be formatted with
[Black](https://github.com/psf/black), with this command:

```sh
$ black
```

## Frontend

Source code in Slurm-web frontend application must be formatted with
[Prettier](https://prettier.io/), with this command:

```sh
$ npm run format
```

# Git Conventions

## Commit Messages

Contributors must do their best to follow guidelines defined in
[conventional commits](https://www.conventionalcommits.org/en/v1.0.0/) for the
commit messages.

## Commits Scopes

List of admitted scopes in the first line of Git commit messages:

* `front`: frontend application
* `gateway`: gateway backend application
* `agent`: agent backend application
* `genjwt`: `slurm-web-gen-jwt-key` command
* `conf`: configuration specific modification
* `dev`: tools for development environment (in `dev/` folder)

# Release Versions Numbering

The versions numbers of Rackslab software releases follow the
[semantic versionning specifications](https://semver.org/).


# Tests

## Frontend

Use this command to run unit tests for frontend:

```console
$ cd frontend && npm run test:unit
```

## Backend

Install tests requirements, typically in a virtual environment

```console
$ pip install -e .[tests]
```

Use this command to run unit tests for backend applications:

```console
$ pytest
```
