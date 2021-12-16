import setuptools

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setuptools.setup(
    name='slurm-web',
    version='2.4.0',
    author='EDF CCN-HPC',
    author_email='dsp-cspit-ccn-hpc@edf.fr',
    description='Web solution for Slurm HPC job schedulers',
    long_description=long_description,
    url='https://github.com/edf-hpc/slurm-web',
    package_dir={'': 'src'},
    packages=setuptools.find_packages(where='src'),
    package_data={'': ['*.wsgi']},
    install_requires=['Flask',
                      'ClusterShell',
                      'pyslurm',
                      'python-ldap',
                      'redis'],
    classifiers=[
        'Programming Language :: Python :: 3',
        'Operating System :: POSIX :: Linux',
    ],
    python_requires='>=3.5',
)
