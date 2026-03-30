from django.shortcuts import render, redirect, get_object_or_404
from django.http import HttpResponse
from .models import Message, Profile
from django.utils import timezone
from datetime import timedelta
from django.contrib import messages

# Create your views here.
def home(request):
    profile = Profile.objects.first()
    if not profile:
        profile = Profile.objects.create()

    if request.method == 'POST':
        # 留言功能
        if 'content' in request.POST:
            content = request.POST.get('content')
            if content:
                # 10 秒频率限制逻辑
                last_post_time = request.session.get('last_post_time')
                now = timezone.now().timestamp()
                
                if last_post_time and (now - last_post_time < 10):
                    return redirect('home')
                
                Message.objects.create(content=content)
                request.session['last_post_time'] = now
                return redirect('home')
        
        # 个人信息编辑功能 (简单校验密码)
        if 'name' in request.POST and 'bio' in request.POST:
            password = request.POST.get('password')
            if password == '200709':
                profile.name = request.POST.get('name')
                profile.bio = request.POST.get('bio')
                profile.announcement = request.POST.get('announcement', profile.announcement)
                profile.save()
                return redirect('home')
            
    all_messages = Message.objects.all()
    return render(request, 'core/home.html', {'messages': all_messages, 'profile': profile})

def delete_message(request, pk):
    message = get_object_or_404(Message, pk=pk)
    message.delete()
    return redirect('home')

def like_message(request, pk):
    message = get_object_or_404(Message, pk=pk)
    message.likes += 1
    message.save()
    return redirect('home')
