/**
 * Liberty Field App — Root Navigator
 *
 * Bottom tab navigation with 4 tabs:
 * - Projects (Dashboard)
 * - Sync Status
 * - Exports
 * - Settings
 *
 * The submission wizard is a nested stack navigator
 * within the Projects tab.
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

// Screens
import { DashboardScreen } from '../screens/Dashboard/DashboardScreen';
import { ProjectDetailScreen } from '../screens/Dashboard/ProjectDetailScreen';
import { WizardStep1Uploads } from '../screens/Submission/WizardStep1_Uploads';
import { WizardStep2Contacts } from '../screens/Submission/WizardStep2_Contacts';
import { WizardStep3SiteQuestions } from '../screens/Submission/WizardStep3_SiteQuestions';
import { WizardStep4Observations } from '../screens/Submission/WizardStep4_Observations';
import { WizardStep5Review } from '../screens/Submission/WizardStep5_Review';
import { SyncScreen } from '../screens/Sync/SyncScreen';
import { ExportListScreen } from '../screens/Exports/ExportListScreen';
import { SettingsScreen } from '../screens/Settings/SettingsScreen';

// ─── Type Definitions ───────────────────────

export type ProjectsStackParamList = {
  Dashboard: undefined;
  ProjectDetail: { projectId: string; projectName: string };
  WizardStep1: { projectId: string; submissionId: string };
  WizardStep2: { projectId: string; submissionId: string };
  WizardStep3: { projectId: string; submissionId: string };
  WizardStep4: { projectId: string; submissionId: string };
  WizardStep5: { projectId: string; submissionId: string };
};

export type RootTabParamList = {
  ProjectsTab: undefined;
  SyncTab: undefined;
  ExportsTab: undefined;
  SettingsTab: undefined;
};

// ─── Projects Stack ─────────────────────────

const ProjectsStack = createNativeStackNavigator<ProjectsStackParamList>();

function ProjectsStackNavigator() {
  return (
    <ProjectsStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.navy },
        headerTintColor: Colors.textOnNavy,
        headerTitleStyle: { fontWeight: '700' },
        headerBackTitleVisible: false,
      }}
    >
      <ProjectsStack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'Projects' }}
      />
      <ProjectsStack.Screen
        name="ProjectDetail"
        component={ProjectDetailScreen}
        options={({ route }) => ({ title: route.params.projectName })}
      />
      <ProjectsStack.Screen
        name="WizardStep1"
        component={WizardStep1Uploads}
        options={{ title: 'Uploads & Documents' }}
      />
      <ProjectsStack.Screen
        name="WizardStep2"
        component={WizardStep2Contacts}
        options={{ title: 'Contacts' }}
      />
      <ProjectsStack.Screen
        name="WizardStep3"
        component={WizardStep3SiteQuestions}
        options={{ title: 'Site Questions' }}
      />
      <ProjectsStack.Screen
        name="WizardStep4"
        component={WizardStep4Observations}
        options={{ title: 'Site Observations' }}
      />
      <ProjectsStack.Screen
        name="WizardStep5"
        component={WizardStep5Review}
        options={{ title: 'Review & Submit' }}
      />
    </ProjectsStack.Navigator>
  );
}

// ─── Bottom Tabs ────────────────────────────

const Tab = createBottomTabNavigator<RootTabParamList>();

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: Colors.navy,
          tabBarInactiveTintColor: Colors.textMuted,
          tabBarStyle: {
            backgroundColor: Colors.white,
            borderTopColor: Colors.border,
            paddingBottom: 4,
            height: 56,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
          },
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: keyof typeof Ionicons.glyphMap;

            switch (route.name) {
              case 'ProjectsTab':
                iconName = focused ? 'home' : 'home-outline';
                break;
              case 'SyncTab':
                iconName = focused ? 'sync-circle' : 'sync-circle-outline';
                break;
              case 'ExportsTab':
                iconName = focused ? 'archive' : 'archive-outline';
                break;
              case 'SettingsTab':
                iconName = focused ? 'settings' : 'settings-outline';
                break;
              default:
                iconName = 'help-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen
          name="ProjectsTab"
          component={ProjectsStackNavigator}
          options={{ title: 'Projects' }}
        />
        <Tab.Screen
          name="SyncTab"
          component={SyncScreen}
          options={{ title: 'Sync' }}
        />
        <Tab.Screen
          name="ExportsTab"
          component={ExportListScreen}
          options={{ title: 'Exports' }}
        />
        <Tab.Screen
          name="SettingsTab"
          component={SettingsScreen}
          options={{ title: 'Settings' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
