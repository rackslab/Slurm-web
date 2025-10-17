# Copyright (c) 2025 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT


class SlurmwebExecBase:
    @staticmethod
    def app():
        raise NotImplementedError

    @classmethod
    def run(cls):
        cls.app().run()
