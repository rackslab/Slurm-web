%define debug_package %{nil}
# Main preamble
Summary: Slurm-web dashboard and REST API
Name: slurm-web
Version: 2.4.0
Release: 1%{?dist}.edf
Source0: %{name}-%{version}.tar.gz
License: GPLv3
Group: Application/System
Prefix: %{_prefix}
Vendor: EDF CCN-HPC <dsp-cspito-ccn-hpc@edf.fr>
Url: https://github.com/scibian/%{__name}

BuildRequires: python36 python3-setuptools
Requires: slurm-web-dashboard slurm-web-confdashboard slurm-web-restapi

%description
Slurm-web HTML/JS dashboard and Python REST API.

#########################################
# Prep, Setup, Build, Install & clean   #
#########################################

%prep
%setup -q

# Build Section
%build
%{__python3} setup.py build

# Install & clean sections
%install
%{__python3} setup.py install --skip-build --root %{buildroot}

# Remove tests from python installation because there is no point in installing
# the tests in RPM packages.
rm -r %{buildroot}%{python3_sitelib}/slurmweb/tests

# Dashboard additional files
install -d %{buildroot}/etc/slurm-web/dashboard
install conf/dashboard/* %{buildroot}/etc/slurm-web/dashboard
install -d %{buildroot}/usr/share/slurm-web/dashboard
cp -dr --no-preserve=ownership dashboard %{buildroot}/usr/share/slurm-web/

# Confdashboard additional files
install -d %{buildroot}/usr/share/slurm-web/conf-server
mv %{buildroot}%{python3_sitelib}/slurmweb/confdashboard/slurm-web-conf.wsgi %{buildroot}/usr/share/slurm-web/conf-server/slurm-web-conf.wsgi

# REST API additional files
install -d %{buildroot}/usr/share/slurm-web/restapi
mv %{buildroot}%{python3_sitelib}/slurmweb/restapi/slurm-web-restapi.wsgi %{buildroot}/usr/share/slurm-web/restapi/slurm-web-restapi.wsgi
install -d %{buildroot}/etc/slurm-web/
install conf/restapi.conf %{buildroot}/etc/slurm-web/restapi.conf
install conf/racks.xml %{buildroot}/etc/slurm-web/racks.xml
install -d %{buildroot}/usr/share/slurm-web/restapi/schema/dtd
install schema/racks.dtd %{buildroot}/usr/share/slurm-web/restapi/schema/dtd

%clean
rm -rf %{buildroot}

#############
# Preambles #
#############

%package common
Summary: Slurm-web common Python module
Group: Application/System
Requires: python36 python3-flask httpd
%description common
Slurm-web common Python modules files

%package dashboard
Summary: Slurm-web HTML+JS dashboard
Group: Application/System
Requires: httpd
%description dashboard
The Slurm-web dashboard in HTML and Javascript that runs in a browser.

%package confdashboard
Summary: Slurm-web conf dashboard
Requires: %{name}-common = %{version}-%{release}
%description confdashboard
Static Flask server to supply config files for the dashboard

%package restapi
Summary: Slurm-web Python REST API
Requires: %{name}-common = %{version}-%{release} python3-redis python3-ldap python3-pyslurm
%description restapi
Slurm-web backend REST API developed in Python using Flask web framework.

##################
# Files Sections #
##################

# Python RPM macro %pycached would help in %files section, as it would avoid
# from duplicating *.pyc lines, but unfortunatel it is not available in
# python-rpm-macros provided by RHEL8.
#
# For reference:
# https://docs.fedoraproject.org/en-US/packaging-guidelines/Python/#_byte_compiling

%files common
%{python3_sitelib}/slurmweb/*.py
%{python3_sitelib}/slurmweb/__pycache__/*.cpython-%{python3_version_nodots}{,.opt-?}.pyc
%{python3_sitelib}/slurm_web-*-py%{python3_version}.egg-info

%files dashboard
/usr/share/slurm-web/dashboard/

%files confdashboard
%config /etc/slurm-web/dashboard/
/usr/share/slurm-web/conf-server/
%{python3_sitelib}/slurmweb/confdashboard/*.py
%{python3_sitelib}/slurmweb/confdashboard/__pycache__/*.cpython-%{python3_version_nodots}{,.opt-?}.pyc

%files restapi
%config /etc/slurm-web/restapi.conf
%config /etc/slurm-web/racks.xml
/usr/share/slurm-web/restapi/
%{python3_sitelib}/slurmweb/restapi/*.py
%{python3_sitelib}/slurmweb/restapi/__pycache__/*.cpython-%{python3_version_nodots}{,.opt-?}.pyc

##########################
# post / postun Sections #
##########################
%post restapi
if [ ! -e /etc/slurm-web/secret.key ] ; then
  head -c 64 /dev/urandom > /etc/slurm-web/secret.key
fi
chown apache: /etc/slurm-web/secret.key
chmod 0400 /etc/slurm-web/secret.key

%postun restapi
rm -f /etc/slurm-web/secret.key

%changelog
* Wed Dec 01 2021 Rémi Palancher <remi-externe.palancher@edf.fr> 2.4.0-1el8.edf
- Adopt packaging scheme similar to scibian
- Back to setuptools as pip/wheels is not available on all supported platforms
- Cleanup of post/postun snippets
- Fix bytes/unicode encoding issues related to python3 porting, newer version
  of pyslurm/slurm or whatever
- Fix restapi module import in WSGI script
- Fix interpolation error with IP addresses whitelist
- Fix handling of job exclusive field in dashboard
* Thu Jun 17 2021 Nilce BOUSSAMBA <nilce-externe.boussamba@edf.fr> 2.3.1-1el8.edf
- Add  postinst & postrm scripts, simplejson python package mandatory to handle Json file & fix some bug related to 2to3 migration
* Mon Mar 22 2021 Guillaume Ranquet <guillaume-externe.ranquet@edf.fr> 2.3.0-1el8.edf
- Initial RPM release
