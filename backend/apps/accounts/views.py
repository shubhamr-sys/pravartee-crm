from rest_framework import generics

from .models import User
from .serializers import UserSerializer


class CurrentUserView(generics.RetrieveAPIView):
    """Return the authenticated user's profile."""

    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user
