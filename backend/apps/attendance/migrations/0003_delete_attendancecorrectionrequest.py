from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("attendance", "0002_attendanceactivity_attendancecorrectionrequest"),
    ]

    operations = [
        migrations.DeleteModel(
            name="AttendanceCorrectionRequest",
        ),
    ]
