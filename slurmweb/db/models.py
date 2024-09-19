# Copyright (c) 2024 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

from peewee import SqliteDatabase, Model, CharField, FloatField, ForeignKeyField, Check

db = SqliteDatabase(None)


def create_db(path):
    db.init(path)

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


class BaseModel(Model):
    class Meta:
        database = db


class Templates(BaseModel):
    name = CharField(unique=True)
    description = CharField()
    batchScript = CharField()
    author = CharField()

    class Meta:
        constraints = [
            Check("LENGTH(name) > 0"),
            Check("LENGTH(name) <= 50"),
            Check("LENGTH(description) <= 100"),
            Check("LENGTH(batchScript) > 0"),
            Check("LENGTH(batchScript) <= 1000"),
            Check("LENGTH(author) <= 50"),
        ]


class Input_types(BaseModel):
    name = CharField(max_length=50)


class Inputs(BaseModel):
    name = CharField(unique=True)
    description = CharField()
    default_value = CharField(null=True, max_length=45)
    minVal = FloatField(null=True)
    maxVal = FloatField(null=True)
    regex = CharField(null=True)
    template = ForeignKeyField(Templates, backref="inputs")
    type = ForeignKeyField(Input_types, backref="inputs", null=False)

    class Meta:
        constraints = [
            Check("LENGTH(name) > 0"),
            Check("LENGTH(name) <= 50"),
            Check("LENGTH(description) <= 100"),
            Check("LENGTH(default_value) <= 45"),
            Check("LENGTH(regex) <= 100"),
            Check("minVal IS NULL OR maxVal IS NULL OR minVal <= maxVal"),
        ]


class Template_users_logins(BaseModel):
    name = CharField()
    template = ForeignKeyField(Templates, backref="users_logins")


class Template_users_accounts(BaseModel):
    name = CharField()
    template = ForeignKeyField(Templates, backref="users_accounts")


class Template_developers_logins(BaseModel):
    name = CharField()
    template = ForeignKeyField(Templates, backref="developers_logins")


class Template_developers_accounts(BaseModel):
    name = CharField()
    template = ForeignKeyField(Templates, backref="developers_accounts")
