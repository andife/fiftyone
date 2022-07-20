"""
| Copyright 2017-2022, Voxel51, Inc.
| `voxel51.com <https://voxel51.com/>`_
|
"""
from typing import TYPE_CHECKING, Any, Dict, List, Optional

from pymongo.database import Database as _Database

from fiftyone.core._pymongo_proxy.change_stream import DatabaseChangeStream
from fiftyone.core._pymongo_proxy.command_cursor import CommandCursor
from fiftyone.core._pymongo_proxy.collection import Collection
from fiftyone.core._pymongo_proxy.util import (
    PymongoAPIBase,
    PymongoProxyMeta,
    with_doc_and_sig,
)

if TYPE_CHECKING:
    from fiftyone.core._pymongo_proxy.client import Client


def _proxy(
    method_name: str,
    instance: "Database",
    *args,
    **kwargs,
) -> Any:
    return instance.request(
        pymongo_attr_name=method_name,
        pymongo_args=args,
        pymongo_kwargs=kwargs,
    )


# TODO: look into the following:
# database.fs.files.distinct("_id", {}, {}) ????
# database.fs.files.delete_many({"_id": {"$in": result_ids}})
# database.fs.chunks.delete_many({"files_id": {"$in": result_ids}})


class Database(
    PymongoAPIBase,
    metaclass=PymongoProxyMeta,
    pymongo_cls=_Database,
    pymongo_method_proxy=_proxy,
):
    """Proxy class for pymongo.database.Database"""

    def __init__(self, client: "Client", name: str, /, *args, **kwargs):
        self._client = client
        self._name = name

        self._init_args = args
        self._init_kwargs = kwargs

        self._collection_cache = {}

    def __getattr__(self, name: str) -> "Collection":
        if name.startswith("_"):
            raise AttributeError(
                "Database has no attribute %r. To access the %s"
                " collection, use database[%r]." % (name, name, name)
            )
        return self.__getitem__(name)

    def __getitem__(self, name: str) -> "Collection":
        return self.get_collection(self, name)

    @with_doc_and_sig(_Database.get_collection)
    def get_collection(  # pylint: disable=missing-docstring
        self, collection_name: str
    ) -> Collection:
        if collection_name not in self._collection_cache:
            self._collection_cache[collection_name] = Collection(
                self, collection_name
            )
        return self._collection_cache[collection_name]

    @property
    def client(self) -> "Client":
        """The client bound to this database"""
        return self._client

    @property
    def api_endpoint_url(self) -> str:
        return self.client.api_endpoint_url

    @property
    def name(self) -> str:
        """The name of this database"""
        return self._name

    @with_doc_and_sig(_Database.aggregate)
    def aggregate(self, *args, **kwargs):
        return CommandCursor(self, *args, **kwargs)

    @with_doc_and_sig(_Database.create_collection)
    def create_collection(self, name: str, *args, **kwargs):
        self.request(
            pymongo_attr_name="create_collection",
            pymongo_args=[name, *args],
            pymongo_kwargs=kwargs,
        )
        return self.get_collection(name, *args, **kwargs)

    @with_doc_and_sig(_Database.watch)
    def watch(self, *args, **kwargs):  # pylint: disable=missing-docstring
        return DatabaseChangeStream(self, *args, **kwargs)

    def build_payload(  # pylint: disable=dangerous-default-value
        self,
        *,
        pymongo_attr_name: Optional[str] = None,
        pymongo_args: Optional[List[Any]] = [],
        pymongo_kwargs: Optional[Dict[str, Any]] = {},
    ) -> Dict[str, Any]:
        payload = super().build_payload(
            pymongo_attr_name=pymongo_attr_name,
            pymongo_args=pymongo_args,
            pymongo_kwargs=pymongo_kwargs,
        )

        payload.update(
            db=self.name,
            db_ar=self.serialize_for_request(self._init_args),
            db_kw=self.serialize_for_request(self._init_kwargs),
        )

        return payload
