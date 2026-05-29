import React from 'react';
import { Amplify, Auth } from 'aws-amplify';
import { withAuthenticator, View, useTheme, Image } from '@aws-amplify/ui-react';
import { Routes, Route } from 'react-router-dom';
import IdleTimer from 'react-idle-timer';

import jwtDecode from 'jwt-decode';

import '@aws-amplify/ui-react/styles.css';

import Dashboard from './components/Pages/Dashboard';
import Users from './components/Pages/Users';
import Reports from './components/Pages/Reports'
import ReportDetail from './components/Pages/ReportDetail';
import Help from './components/Pages/Help';
import Account from './components/Pages/Account';
import AccessDenied from './components/Pages/AccessDenied';
import NavBar from './components/navbar';
import IdleTimeoutConfirm from './components/Dialogs/IdleTimeoutConfirm';
import awsExports from './aws-exports';

import UserContext from './contexts/userContext';
import bellRingLogo from './bell-ring.png';

Amplify.configure(awsExports);

const components = {
  Header() {
    const { tokens } = useTheme();

    return (
      <View textAlign="center" padding={tokens.space.large}>
        <Image
          alt="EWS logo"
          src={bellRingLogo}
          height="100px"
        />
      </View>
    );
  },
}

function App({ signOut, user }) {
  let idleTimerRef;
  const [currentUser, setCurrentUser] = React.useState();
  const [userRoles, setUserRoles] = React.useState([]);
  const [timeout,] = React.useState(1000 * 300);
  const [isTimedOut, setIsTimedOut] = React.useState(false);
  const [showModal, setShowModal] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    async function init() {
      if (active && user) {
        try {
          const session = await Auth.currentSession();
          const sessionIdInfo = jwtDecode(session.getIdToken().jwtToken);
          setUserRoles(sessionIdInfo['cognito:groups'] || []);
          setCurrentUser({ sub: sessionIdInfo.sub, name: sessionIdInfo.name })
        } catch (e) {
          console.log('session expired');
          signOut();
        }
      }
    }
    init();
    return () => {
      active = false;
    };
  }, [user]);

  const logout = async () => {
    console.log(`I get in here`)
    await signOut();
    setUserRoles([]);
  }

  const onAction = () => {
    setIsTimedOut(false);
  }

  const onActive = () => {
    setIsTimedOut(false);
  };

  const onIdle = async (e) => {
    if (isTimedOut) {
      await signOut();
      setUserRoles([]);
    } else if (user) {
      setShowModal(true);
      idleTimerRef.reset();
      setIsTimedOut(true);
    }
  }

  const handleCancel = async () => {
    setIsTimedOut(true);
    setShowModal(false);
    await signOut();
    setUserRoles([]);
  };

  const handleOk = () => {
    setIsTimedOut(false);
    idleTimerRef.reset();
    setShowModal(false);
  };

  return (
    <UserContext.Provider value={{ user: { ...currentUser } }}>
      <div>
        <IdleTimer
          ref={ref => { idleTimerRef = ref }}
          element={document}
          onActive={onActive}
          onIdle={onIdle}
          onAction={onAction}
          debounce={250}
          timeout={timeout} />
        <IdleTimeoutConfirm open={showModal} expired={handleCancel} resume={handleOk} cancel={handleCancel} />
        {user &&
          <React.Fragment>
            <NavBar onLogout={logout} userRoles={userRoles} signOut={signOut} />
            <Routes>
              <Route exact path="/" element={<Dashboard roles="analyst,admin" userRoles={userRoles} />} />
              {userRoles && userRoles.includes('admin') && <Route path="/users" element={<Users roles="admin" userRoles={userRoles} />} />}
              <Route exact path="/reports" element={<Reports roles="analyst,admin" userRoles={userRoles} />} />
              <Route path="/reports/:id" element={<ReportDetail roles="analyst,admin" userRoles={userRoles} />} user={user} />
              <Route path="/help" element={<Help roles="analyst,admin" userRoles={userRoles} />} />
              <Route path="/account" element={<Account />} />
              <Route path="/access-denied" element={<AccessDenied />} />
            </Routes></React.Fragment>}
      </div>
    </UserContext.Provider>
  );
}

export default withAuthenticator(App, { components, hideSignUp: true });