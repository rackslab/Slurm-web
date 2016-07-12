#!/usr/bin/env python
# -*- coding: utf-8 -*-
#
# Copyright (C) 2015 EDF SA
#
# This file is part of slurm-web.
#
# slurm-web is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# slurm-web is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with slurm-web.  If not, see <http://www.gnu.org/licenses/>.

import importlib

def setup_mock(context):

    from mocks.settings import MockConfigParser
    from mocks.racks import MockRacksXML
    import mock
    from StringIO import StringIO

    setup_m = importlib.import_module('setups.' + context)

    setup = setup_m.setup_cluster()
    setup.feed_mocks()

    m_read = mock.Mock()
    m_read.return_value = MockConfigParser()
    p_read = mock.patch("settings.ConfigParser.ConfigParser", m_read, create=True)
    p_read.start()

    xml_s = setup.racks.doc.toprettyxml(indent='  ', encoding='UTF-8').strip()
    m_open = mock.mock_open(read_data=xml_s)
    p_open = mock.patch("racks.open", m_open, create=True)
    p_open.start()
