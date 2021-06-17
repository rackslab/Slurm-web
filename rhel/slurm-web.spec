%define debug_package %{nil}
# Main preamble
Summary: Slurm Web Python REST API
Name: slurm-web
Version: 2.3.1
Release:  1%{?dist}.edf
Source0: %{name}-%{version}.tar.gz
License: GPLv3
Group: Application/System
Prefix: %{_prefix}
Vendor: EDF CCN HPC <dsp-cspito-ccn-hpc@edf.fr>
Url: https://github.com/scibian/%{__name}

BuildRequires: python36 python3-pip python3-pip-wheel
Requires: slurm-web-dashboard slurm-web-dashboard-backend slurm-web-restapi

%description
Slurm Web backend  REST API developed in Python using Flask web framework.

#########################################
# Prep, Setup, Build, Install & clean   #
#########################################

%prep
%setup -q

# Build Section
%build
python3 -m pip wheel .

# Install & clean sections
%install
python3 -m pip install .
install -d %{buildroot}/etc/slurm-web/dashboard
install conf/dashboard/* %{buildroot}/etc/slurm-web/dashboard
install -d %{buildroot}/usr/share/slurm-web/dashboard
cp -dr --no-preserve=ownership dashboard %{buildroot}/usr/share/slurm-web/
install -d %{buildroot}/usr/share/slurm-web/conf-server
install -m 644 src/slurmweb/confdashboard/slurm-web-conf.wsgi %{buildroot}/usr/share/slurm-web/conf-server/slurm-web-conf.wsgi
install -d %{buildroot}/usr/share/slurm-web/restapi
install -m 644 src/slurmweb/restapi/slurm-web-restapi.wsgi %{buildroot}/usr/share/slurm-web/restapi/slurm-web-restapi.wsgi
install -d %{buildroot}/etc/slurm-web/
install conf/restapi.conf %{buildroot}/etc/slurm-web/restapi.conf
install conf/racks.xml %{buildroot}/etc/slurm-web/racks.xml
install schema/racks.dtd %{buildroot}/usr/share/slurm-web/restapi/schema/dtd

%clean
rm -rf %{buildroot}

#############
# Preambles #
#############

%package dashboard
Summary: Slurm Web HTML+JS dashboard
Group: Application/System
%description dashboard
The dashboard in HTML and Javascript that runs in a browser.

%package dashboard-backend
Summary: Slurm Web conf dashboard
Requires: python36 python3-flask
%description dashboard-backend
Static Flask server to supply config files for the dashboard

%package restapi
Summary: Slurm Web Python REST API
Requires: python36 python3-flask python3-redis python3-ldap python3-pyslurm python3-Cython python3-itsdangerous python3-simplejson
%description restapi
Slurm Web backend  REST API developed in Python using Flask web framework.

##################
# Files Sections #
##################

# Main meta-package
%files
%{python3_sitelib}/slurmweb_core*

%files dashboard
/usr/share/slurm-web/dashboard*

%files dashboard-backend
%config /etc/slurm-web/dashboard/*
/usr/share/slurm-web/conf-server
%{python3_sitelib}/slurmweb/confdashboard

%files restapi
%config /etc/slurm-web/restapi.conf
%config /etc/slurm-web/racks.xml
/usr/share/slurm-web/restapi
%{python3_sitelib}/slurmweb/restapi

##############################
# Postinst / Postrm Sections #
##############################
%post restapi
#! /bin/sh
# postinst script for slurm-web-restapi
#

set -e
arg='configure'
case "$arg" in
    configure)
      # If the key file does exist, generate if with linux fast pseudo-random
      # number generator.
      if [ ! -e /etc/slurm-web/secret.key ] ; then
        head -c 64 /dev/urandom > /etc/slurm-web/secret.key
      fi
      adduser --system --shell=/bin/sh --no-create-home --home /nonexistent apache
      chown apache: /etc/slurm-web/secret.key
      chmod 0400 /etc/slurm-web/secret.key
    ;;

    abort-upgrade|abort-remove|abort-deconfigure)

    ;;

    *)
        echo "postinst called with unknown argument \`$1'" >&2
        exit 1
    ;;
esac

exit 0

%postun restapi
#! /bin/sh
# postrm script for slurm-web-restapi
set -e
arg='remove'
case "$arg" in
       remove)
         rm -f /etc/slurm-web/secret.key
        ;;

       remove|upgrade|failed-upgrade|abort-install|abort-upgrade|disappear)

        ;;

    *)
        echo "postrm called with unknown argument \`$1'" >&2
        exit 1

esac

exit 0

%changelog
* Fri Jun 17 2021 Nilce BOUSSAMBA <nilce-externe.boussamba@edf.fr> 2.3.1-1el8.edf
- Add  postinst & postrm scripts, simplejson python package mandatory to handle Json file & fix some bug related to 2to3 migration
* Mon Mar 22 2021 Guillaume Ranquet <guillaume-externe.ranquet@edf.fr> 2.3.0-1el8.edf
- Initial RPM release
