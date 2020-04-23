"""
Ingest CIFAR100 data in noSQL database

"""
import logging

from pymongo import MongoClient

import eta.core.image as etai
import eta.core.serial as etas


logger = logging.getLogger(__name__)


##############
# PARAMETERS #
##############

partitions = ["train", "test"]

fine_labels_template = "data/%s_fine.json"
coarse_labels_template = "data/%s_coarse.json"


########
# CODE #
########

client = MongoClient()

db = client.fiftyone_database

dataset = db.cifar100

for partition in partitions:
    logger.info("Ingesting '%s' partition" % partition)

    fine_labels = etas.read_json(fine_labels_template % partition)
    coarse_labels = etas.read_json(coarse_labels_template % partition)

    images = [
        {
            "filepath": filepath,
            "labels": {
                "fine_label": fine_labels[filepath],
                "coarse_label": coarse_labels[filepath],
            },
            "metadata": etai.ImageMetadata.build_for(filepath).serialize(),
        }
        for filepath in fine_labels
    ]
    dataset.insert(images)
