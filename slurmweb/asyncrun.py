# Copyright (c) 2024 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

"""This module contains a backport of asyncio.run() compatible with Python 3.6. It is
designed to be called through asyncio_run() function which detects Python interpreter
version and call appropriate implementation consequently."""

import asyncio
import sys


def _cancel_all_tasks(loop):
    """Backport of standard Python asyncio.runners._cancel_all_tasks() for
    Python 3.6."""
    to_cancel = asyncio.Task.all_tasks(loop)
    if not to_cancel:
        return

    for task in to_cancel:
        task.cancel()

    loop.run_until_complete(
        asyncio.tasks._gather(*to_cancel, loop=loop, return_exceptions=True)
    )

    for task in to_cancel:
        if task.cancelled():
            continue
        if task.exception() is not None:
            loop.call_exception_handler(
                {
                    "message": "unhandled exception during asyncio.run() shutdown",
                    "exception": task.exception(),
                    "task": task,
                }
            )


def asyncio_run_backport(main):
    """Backport of standard Python asyncio.run() for Python 3.6."""
    if asyncio.events._get_running_loop() is not None:
        raise RuntimeError("asyncio.run() cannot be called from a running event loop")

    if not asyncio.coroutines.iscoroutine(main):
        raise ValueError("a coroutine was expected, got {!r}".format(main))

    loop = asyncio.events.new_event_loop()
    try:
        asyncio.events.set_event_loop(loop)
        return loop.run_until_complete(main)
    finally:
        try:
            _cancel_all_tasks(loop)
            loop.run_until_complete(loop.shutdown_asyncgens())
        finally:
            asyncio.events.set_event_loop(None)
            loop.close()


def asyncio_run(main):
    """Wrapper of asyncio.run() or asyncio_run_backport when running on Python 3.6."""
    if sys.version_info[0] >= 3 and sys.version_info[1] >= 7:
        return asyncio.run(main)
    else:
        return asyncio_run_backport(main)
