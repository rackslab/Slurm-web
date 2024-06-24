# Copyright (c) 2024 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

from peewee import SqliteDatabase, Model, CharField, FloatField, ForeignKeyField

db = SqliteDatabase(None)


def create_db(path):
    db.init(path)

    with db:
        db.create_tables(
            [
                Templates,
                Types,
                Inputs,
                Template_developers_logins,
                Template_developers_accounts,
                Template_users_accounts,
                Template_users_logins,
            ]
        )


class BaseModel(Model):
    class Meta:
        database = db


class Templates(BaseModel):
    name = CharField(max_length=50, unique=True)
    description = CharField(max_length=100)


class Types(BaseModel):
    name = CharField(max_length=50)


class Inputs(BaseModel):
    name = CharField(max_length=50, unique=True)
    description = CharField(max_length=100)
    default = CharField(null=True, max_length=45)
    minVal = FloatField(null=True)
    maxVal = FloatField(null=True)
    regex = CharField(null=True, max_length=100)
    template = ForeignKeyField(Templates, backref="inputs")
    type = ForeignKeyField(Types, backref="inputs")


class Template_users_logins(BaseModel):
    name = CharField(max_length=50)
    template = ForeignKeyField(Templates, backref="users_logins")


class Template_users_accounts(BaseModel):
    name = CharField(max_length=50)
    template = ForeignKeyField(Templates, backref="users_accounts")


class Template_developers_logins(BaseModel):
    name = CharField(max_length=50)
    template = ForeignKeyField(Templates, backref="developers_logins")


class Template_developers_accounts(BaseModel):
    name = CharField(max_length=50)
    template = ForeignKeyField(Templates, backref="developers_accounts")
