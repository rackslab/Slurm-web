# Copyright (C) 2017 Kilian Cavalotti <kilian@stanford.edu>
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

# Use phusion/baseimage as base image. To make your builds reproducible, make
# sure you lock down to a specific version, not to `latest`!
# See https://github.com/phusion/baseimage-docker/blob/master/Changelog.md for
# a list of version numbers.

FROM phusion/baseimage:0.9.19
MAINTAINER Kilian Cavalotti <kilian@stanford.edu>

# Set correct environment variables.
ENV HOME /root
ENV DEBIAN_FRONTEND noninteractive
ENV LC_ALL C.UTF-8
ENV LANG en_US.UTF-8
ENV LANGUAGE en_US.UTF-8

# Use baseimage-docker's init system
CMD ["/sbin/my_init"]

# Install locales
RUN locale-gen en_US.UTF-8

ENV BUILD_DEPS="git devscripts equivs apt-utils apache2-dev libslurm-dev python-setuptools cython python-dev libslurmdb-dev libslurm-dev ca-certificates"

ENV RUN_DEPS="apache2 libapache2-mod-wsgi javascript-common python-flask clustershell libjs-bootstrap libjs-jquery-flot libjs-jquery-tablesorter munge slurm-llnl node-uglify fonts-dejavu-core python-ldap python-redis libjs-requirejs libjs-requirejs-text libjs-three libjs-d3 libjs-handlebars"

# Enable universe and multiverse
#RUN cat /etc/apt/sources.list && \
#    sed -i 's/^#\s*\(deb.*universe\)$/\1/g' /etc/apt/sources.list && \
#    sed -i 's/^#\s*\(deb.*multiverse\)$/\1/g' /etc/apt/sources.list

# Install system dependencies
RUN apt-get update -q && \
    apt-get -y install $BUILD_DEPS $RUN_DEPS && \
    ln -s /usr/lib/x86_64-linux-gnu/ /usr/lib64

RUN a2enmod wsgi && \
    a2enconf javascript-common

# Build and install specific deps
ENV SLURM_VER=15.08.2
RUN cd /usr/src && \
    git clone https://github.com/PySlurm/pyslurm.git && \
    cd pyslurm && \
    git checkout remotes/origin/$SLURM_VER && \
    sed -i 's/__max_slurm_hex_version__ = "0x0f0803"/__max_slurm_hex_version__ = "0x0f0807"/' setup.py && \
    tar cvfj ../python-pyslurm_$SLURM_VER.orig.tar.bz2 --exclude .git . && \
    mk-build-deps -ri -t "apt-get -y --no-install-recommends" && \
    dch -v $SLURM_VER-1 -D testing "New upstream release" && \
    debuild -us -uc && \
    dpkg -i ../python-pyslurm_$SLURM_VER-1_amd64.deb

RUN cd /usr/src && \
    git clone https://github.com/edf-hpc/opentypejs.git && \
    cd opentypejs && \
    git checkout debian/0.4.3-2 && \
	tar cvfj ../opentypejs_0.4.3.orig.tar.bz2 --exclude .git . && \
	mk-build-deps -ri -t "apt-get -y --no-install-recommends" && \
	debuild -us -uc && \
	dpkg -i ../node-opentypejs_0.4.3-2_all.deb

RUN cd /usr/src && \
	git clone https://github.com/edf-hpc/libjs-bootstrap-typeahead.git && \
	cd libjs-bootstrap-typeahead/ && \
    git checkout debian/0.11.1-1 && \
	tar cvfj ../libjs-bootstrap-typeahead_0.11.1.orig.tar.bz2 --exclude .git . && \
	debuild -us -uc && \
	dpkg -i ../libjs-bootstrap-typeahead_0.11.1-1_all.deb

RUN cd /usr/src && \
	git clone https://github.com/edf-hpc/libjs-bootstrap-tagsinput.git && \
	cd libjs-bootstrap-tagsinput/ && \
    git checkout debian/0.8.0-1 && \
	tar cvfj ../libjs-bootstrap-tagsinput_0.8.0.orig.tar.bz2 --exclude .git . && \
	debuild -us -uc && \
	dpkg -i ../libjs-bootstrap-tagsinput_0.8.0-1_all.deb


RUN cd /usr/src && \
    git clone https://github.com/edf-hpc/slurm-web.git && \
    cd slurm-web && \
    git checkout debian/2.0.0 && \
    debuild -us -uc && \
    dpkg -i ../slurm-web-*deb

# Create apache2 service file and start it
RUN rm /etc/apache2/sites-available/default-ssl.conf && \
    echo www-data > /etc/container_environment/APACHE_RUN_USER && \
    echo www-data > /etc/container_environment/APACHE_RUN_GROUP && \
    echo /var/log/apache2 > /etc/container_environment/APACHE_LOG_DIR && \
    echo /var/lock/apache2 > /etc/container_environment/APACHE_LOCK_DIR && \
    echo /var/run/apache2.pid > /etc/container_environment/APACHE_PID_FILE && \
    echo /var/run/apache2 > /etc/container_environment/APACHE_RUN_DIR && \
    chown -R www-data:www-data /var/log/apache2
RUN mkdir -p /etc/service/apache2
COPY apache2.sh /etc/service/apache2/run
RUN chmod +x /etc/service/apache2/run

# Create munge service file and start it
RUN chown munge: /var/log/munge /var/lib/munge && \
    mkdir -p /etc/service/munge
COPY munge.sh /etc/service/munge/run
RUN chmod +x /etc/service/munge/run


# Cleanup
RUN apt-get clean

EXPOSE 80/tcp

VOLUME ["/etc/slurm-web"]
