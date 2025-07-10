# Daily Logs and Goals Tracking System

This system provides comprehensive tracking of user activity with goal management for healthcare providers and patients.

## Features

### For Patients

- **Daily Activity Logging**: Record time spent on therapy activities
- **Interactive Calendar**: Visual monthly view showing activity data with color-coded goal achievement
- **Statistics Dashboard**: Apple Fitness-style circular progress indicators for daily and weekly goals
- **Real-time Progress Tracking**: View current progress toward daily and weekly goals
- **Quick Log Entry**: Easy-to-use form with preset time options (30min, 1h, 2h, 4h)

### For Healthcare Providers (Doctors)

- **Patient Management**: View and manage all assigned patients
- **Goal Setting**: Set individual daily and weekly goals for each patient
- **Progress Monitoring**: Track patient progress and goal achievement
- **Quick Goal Presets**: Default (4h/28h), Light (3h/21h), Intensive (5h/35h) options

## Database Schema

### Tables Created

#### 1. `daily_logs`

- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key to auth.users)
- `date` (DATE, Unique per user)
- `time_spent_minutes` (INTEGER)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### 2. `user_goals`

- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key to auth.users, Unique)
- `daily_goal_minutes` (INTEGER, Default: 240 = 4 hours)
- `weekly_goal_minutes` (INTEGER, Default: 1680 = 28 hours)
- `set_by_doctor_id` (UUID, Foreign Key to auth.users)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### 3. `user_data` (Updated)

- Added `doctor_id` (UUID, Foreign Key to auth.users)
- Links patients to their healthcare providers

### Database Setup

1. **Run the SQL Schema**:
   Execute the contents of `database_schema.sql` in your Supabase SQL editor.

2. **Row Level Security (RLS)**:

   - Users can only view/modify their own daily logs
   - Users can view their own goals
   - Doctors can view/modify goals for their assigned patients
   - Doctors can view patients assigned to them

3. **Default Data**:
   - Default goals (4h daily, 28h weekly) are automatically created for existing users
   - New users will get default goals upon first login

## Component Structure

### Main Components

1. **Calendar.tsx**

   - Monthly calendar view
   - Color-coded days based on goal achievement
   - Monthly statistics (total, average, active days)
   - Legend showing achievement levels

2. **Statistics.tsx**

   - Apple Fitness-style circular progress indicators
   - Daily and weekly goal progress
   - Weekly overview with individual day progress
   - Motivational messages based on progress

3. **LogEntry.tsx**

   - Form for entering daily activity time
   - Date selection (prevents future dates)
   - Hours and minutes input with validation
   - Quick-select buttons for common times
   - Updates existing logs or creates new ones

4. **GoalsManagement.tsx** (For Doctors)
   - Patient list with current goals
   - Goal setting form with presets
   - Patient selection and management
   - Statistics overview for all patients

### Navigation Updates

The Dashboard now includes four main sections:

- **Dashboard**: Home page with quick actions and log entry
- **Calendar**: Monthly activity calendar
- **Statistics**: Progress tracking with circular indicators
- **Settings**: Account management

## Usage Instructions

### For Patients

1. **Log Daily Activity**:

   - Go to Dashboard
   - Use the "Log Your Activity" form
   - Select date and enter hours/minutes
   - Use quick-select buttons for common times
   - Click "Save Activity Log"

2. **View Progress**:

   - Navigate to "Statistics" to see circular progress indicators
   - View daily and weekly goal achievement
   - Check weekly overview for daily progress

3. **Review Calendar**:
   - Navigate to "Calendar"
   - See monthly view with color-coded achievement levels
   - Navigate between months
   - View monthly statistics

### For Healthcare Providers

1. **Assign Patients**:

   - Update the `user_data` table to set `doctor_id` for patients
   - Patients will appear in the Goals Management interface

2. **Set Goals**:

   - Use the Goals Management component
   - Select a patient from the list
   - Adjust daily and weekly goals
   - Use preset options or custom values
   - Save goals for the patient

3. **Monitor Progress**:
   - View patient statistics in the Goals Management interface
   - Track average goals across all patients
   - Monitor individual patient achievement

## Goal Achievement Color Coding

- **Green (100%+)**: Goal exceeded
- **Light Green (75-99%)**: Close to goal
- **Yellow (50-74%)**: Moderate progress
- **Orange (25-49%)**: Low progress
- **Red (0-24%)**: Minimal progress
- **Gray**: No data recorded

## Technical Features

- **Real-time Updates**: Components refresh when data changes
- **Dark Mode Support**: All components support light/dark themes
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Data Validation**: Prevents invalid entries (future dates, excessive hours)
- **Error Handling**: Graceful error messages and fallbacks
- **Performance Optimized**: Efficient database queries with indexes

## Security Features

- **Row Level Security**: Users can only access their own data
- **Doctor-Patient Relationship**: Secure access control for healthcare providers
- **Input Validation**: Server-side and client-side validation
- **Audit Trail**: Created/updated timestamps for all records

## Future Enhancements

- Notes and reminders system
- Goal achievement notifications
- Export functionality for reports
- Advanced analytics and trends
- Mobile app companion
- Integration with wearable devices
