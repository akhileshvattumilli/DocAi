from django.db import migrations, models


def dedupe_docuser(apps, schema_editor):
    DocUser = apps.get_model("documents", "DocUser")
    seen = {}
    for row in DocUser.objects.order_by("id"):
        key = (row.doc_id, row.user_id)
        if key in seen:
            DocUser.objects.filter(id=seen[key]).delete()
        seen[key] = row.id


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("documents", "0004_doc_yjs_state_delete_docinvite"),
    ]

    operations = [
        migrations.RunPython(dedupe_docuser, noop_reverse),
        migrations.AddConstraint(
            model_name="docuser",
            constraint=models.UniqueConstraint(fields=["doc", "user"], name="unique_doc_user"),
        ),
    ]
