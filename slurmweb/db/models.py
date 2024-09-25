# Copyright (c) 2024 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

import peewee

db = peewee.SqliteDatabase(None)


def create_db(path):
    db.init(path, pragmas={"foreign_keys": 1})

    with db:
        db.create_tables(
            [
                Templates,
                Input_types,
                Inputs,
                Template_developers_logins,
                Template_developers_accounts,
                Template_users_accounts,
                Template_users_logins,
            ]
        )
        Input_types.get_or_create(name="float")
        Input_types.get_or_create(name="string")
        Input_types.get_or_create(name="int")


class BaseModel(peewee.Model):
    class Meta:
        database = db


class Templates(BaseModel):
    name = peewee.CharField(unique=True)
    description = peewee.CharField()
    batchScript = peewee.CharField()
    author = peewee.CharField()

    class Meta:
        constraints = [
            peewee.Check("LENGTH(name) > 0"),
            peewee.Check("LENGTH(name) <= 50"),
            peewee.Check("LENGTH(description) <= 100"),
            peewee.Check("LENGTH(batchScript) > 0"),
            peewee.Check("LENGTH(batchScript) <= 1000"),
            peewee.Check("LENGTH(author) <= 50"),
        ]


class Input_types(BaseModel):
    name = peewee.CharField(max_length=50)


class Inputs(BaseModel):
    name = peewee.CharField(unique=True)
    description = peewee.CharField()
    default_value = peewee.CharField(null=True, max_length=45)
    minVal = peewee.FloatField(null=True)
    maxVal = peewee.FloatField(null=True)
    regex = peewee.CharField(null=True)
    template = peewee.ForeignKeyField(Templates, backref="inputs")
    type = peewee.ForeignKeyField(Input_types, backref="inputs", null=False)

    class Meta:
        constraints = [
            peewee.Check("LENGTH(name) > 0"),
            peewee.Check("LENGTH(name) <= 50"),
            peewee.Check("LENGTH(description) <= 100"),
            peewee.Check("LENGTH(default_value) <= 45"),
            peewee.Check("LENGTH(regex) <= 100"),
            peewee.Check("minVal IS NULL OR maxVal IS NULL OR minVal <= maxVal"),
        ]


class Template_users_logins(BaseModel):
    name = peewee.CharField()
    template = peewee.ForeignKeyField(Templates, backref="users_logins")


class Template_users_accounts(BaseModel):
    name = peewee.CharField()
    template = peewee.ForeignKeyField(Templates, backref="users_accounts")


class Template_developers_logins(BaseModel):
    name = peewee.CharField()
    template = peewee.ForeignKeyField(Templates, backref="developers_logins")


class Template_developers_accounts(BaseModel):
    name = peewee.CharField()
    template = peewee.ForeignKeyField(Templates, backref="developers_accounts")
