How-to Contribute
=================

Send patches
------------

If you do not have push rights on the repository, please open a pull request
with your commits for review. We do not *merge* pull requests to avoid merge
commits in git history. Once reviewed, commits are applied manually (keeping
authors) on HEAD to keep a flat history.

Commits
-------

We follow standard git commit guidelines:

https://www.git-scm.com/book/en/v2/Distributed-Git-Contributing-to-a-Project#Commit-Guidelines

In a few words:

* 1st line summary max. 50 chars
* unless really obvious, a blank line and a detailled description wrap to 72
  chars focused on what and why instead of how (how must be wisely explained in
  codes comments or in documentation)
* only one logical changeset per commit
* git diff --check error free

Code style
----------

Indentation:

* Python: 4 spaces.
* JS/HTML: 2 spaces.

Python code must respect pep8.
