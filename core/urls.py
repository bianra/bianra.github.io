from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('delete/<int:pk>/', views.delete_message, name='delete_message'),
    path('like/<int:pk>/', views.like_message, name='like_message'),
]
