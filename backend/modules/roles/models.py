from django.db import models

class Permission(models.Model):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=100, unique=True)
    module = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True, help_text="What this permission allows")

    def __str__(self):
        return f"{self.module}: {self.name}"

class Role(models.Model):
    name = models.CharField(max_length=100, unique=True)
    permissions = models.ManyToManyField(Permission, blank=True)

    def __str__(self):
        return self.name
