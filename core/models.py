from django.db import models

# Create your models here.
class Profile(models.Model):
    name = models.CharField(max_length=50, default="我的个人主页")
    bio = models.TextField(default="这是一段关于我的介绍。在这里你可以记录心情，留下印记。欢迎大家留言互动！")
    announcement = models.TextField(default="欢迎来到 bianra 的小屋！\n这里是一个自由留言的空间。\n点击头像可以编辑主页信息。")

    def __str__(self):
        return self.name

class Message(models.Model):
    content = models.TextField(verbose_name="留言内容")
    likes = models.PositiveIntegerField(default=0, verbose_name="点赞数")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="发布时间")

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Message at {self.created_at}"

    @property
    def display_likes(self):
        if self.likes > 99:
            return "99+"
        return str(self.likes)
