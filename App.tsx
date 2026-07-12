import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DarkTheme, DefaultTheme } from '@react-navigation/native';

import HomeScreen from './screens/HomeScreen';
import ProjectsScreen from './screens/ProjectsScreen';
import ProjectDetailScreen from './screens/ProjectDetailScreen';
import FocusScreen from './screens/FocusScreen';
import InsightsScreen from './screens/InsightsScreen';
import { initDatabase } from './db/database';

initDatabase();

const Tab = createBottomTabNavigator();
const ProjectsStack = createNativeStackNavigator();

function ProjectsStackScreen() {
  return (
    <ProjectsStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0A0A0F' },
      }}
    >
      <ProjectsStack.Screen name="ProjectsList" component={ProjectsScreen} />
      <ProjectsStack.Screen name="ProjectDetail" component={ProjectDetailScreen} />
    </ProjectsStack.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer
      theme={{
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          background: '#0A0A0F',
          card: '#16161D',
        },
      }}
    >
      <StatusBar barStyle="light-content" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: { backgroundColor: '#16161D', borderTopColor: '#1F1F29' },
          tabBarActiveTintColor: '#6C5CE7',
          tabBarInactiveTintColor: '#A5ABB6',
          tabBarIcon: ({ color, size }) => {
            const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
              Home: 'grid-outline',
              Projects: 'layers-outline',
              Focus: 'time-outline',
              Insights: 'bar-chart-outline',
            };
            return <Ionicons name={icons[route.name]} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Projects" component={ProjectsStackScreen} />
        <Tab.Screen name="Focus" component={FocusScreen} />
        <Tab.Screen name="Insights" component={InsightsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}