# Copyright (C) 2019-2022 Intel Corporation
# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import zipfile
from datumaro.components.dataset import Dataset
from pyunpack import Archive

from cvat.apps.dataset_manager.bindings import (GetCVATDataExtractor,
    import_dm_annotations)
from cvat.apps.dataset_manager.util import make_zip_archive
from cvat.apps.engine.models import DimensionType

from .registry import dm_env, exporter, importer


@exporter(name="Datumaro", ext="ZIP", version="1.0")
def _export(dst_file, temp_dir, instance_data, save_images=False):
    dataset = Dataset.from_extractors(GetCVATDataExtractor(
        instance_data=instance_data, include_images=save_images), env=dm_env)
    dataset.export(temp_dir, 'datumaro', save_images=save_images)

    make_zip_archive(temp_dir, dst_file)

@importer(name="Datumaro", ext="JSON, ZIP", version="1.0")
def _import(src_file, temp_dir, instance_data, load_data_callback=None, **kwargs):
    if zipfile.is_zipfile(src_file):
        zipfile.ZipFile(src_file).extractall(temp_dir)
        dataset = Dataset.import_from(temp_dir, 'datumaro', env=dm_env)
    else:
        load_data_callback = None
        dataset = Dataset.import_from(src_file.name, 'datumaro', env=dm_env)

    if load_data_callback is not None:
        load_data_callback(dataset, instance_data)
    import_dm_annotations(dataset, instance_data)

@exporter(name="Datumaro 3D", ext="ZIP", version="1.0", dimension=DimensionType.DIM_3D)
def _export(dst_file, temp_dir, instance_data, save_images=False):
    dataset = Dataset.from_extractors(GetCVATDataExtractor(
        instance_data=instance_data, include_images=save_images,
            dimension=DimensionType.DIM_3D), env=dm_env)

    dataset.export(temp_dir, 'datumaro', save_images=save_images)

    make_zip_archive(temp_dir, dst_file)

@importer(name="Datumaro 3D", ext="ZIP", version="1.0", dimension=DimensionType.DIM_3D)
def _import(src_file, temp_dir, instance_data, load_data_callback=None, **kwargs):
    Archive(src_file.name).extractall(temp_dir)

    dataset = Dataset.import_from(temp_dir, 'datumaro', env=dm_env)

    if load_data_callback is not None:
        load_data_callback(dataset, instance_data)
    import_dm_annotations(dataset, instance_data)
