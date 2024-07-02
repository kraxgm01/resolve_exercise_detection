import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Container, Typography, List, ListItem, ListItemText, ListItemButton, Paper, Box, Divider } from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  marginTop: theme.spacing(2),
}));

const StyledListItemButton = styled(ListItemButton)(({ theme }) => ({
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

const ExerciseList = () => {
  const [exercises, setExercises] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchExercises = async () => {
      const response = await axios.get('https://resovle360backend-production.up.railway.app/api/exercises');
      setExercises(response.data);
    };

    fetchExercises();
  }, []);

  return (
    <Box sx={{ minHeight: '100vh', minWidth: '200vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: 8, backgroundColor: '#f5f5f5' }}>
      <Container maxWidth="md">
        <Typography variant="h3" gutterBottom sx={{ fontWeight: 700, color: '#333', textAlign: 'center' }}>
          Resolve 360
        </Typography>
        <StyledPaper elevation={3} sx={{ marginBottom: 4 }}>
          <Typography variant="h5" color="red" gutterBottom sx={{ fontWeight: 500 }}>
            Instructions:
          </Typography>
          <Box sx={{ color: '#777', marginBottom: 2 }}>
            <Typography variant="body1" color="red">
              Follow these instructions carefully :
            </Typography>
            <ul>
              <li>Full body should be visible in the camera while doing the exercise.</li>
              <li>Stand in a bright illuminated room for accurate detection.</li>
              <li>Once started,steps will automatically be naviagted.Do not press back in between the exercise.</li>
              <li>Wait 3 seconds before starting a step, and if detetction does not start after 3 seconds, REFRESH THE PAGE.</li>
              <li>Make sure you are connected to the internet at all times.</li>
            </ul>
          </Box>
          <Divider sx={{ marginBottom: 2 }} />
        </StyledPaper>

        <StyledPaper elevation={3} sx={{ marginBottom: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 500, color: '#555' }}>
            Available Exercises:
          </Typography>
          <List>
            {exercises.map((exercise, index) => (
              <ListItem key={index} disablePadding>
                <StyledListItemButton
                  sx={{
                    marginBottom: 1,
                    padding: 2,
                    borderRadius: 2,
                    boxShadow: 1,
                    backgroundColor: '#ffffff',
                    '&:hover': {
                      backgroundColor: '#e0f7fa',
                      boxShadow: 3,
                    },
                  }}
                  onClick={() => {
                    navigate(`/instructions`, { state: { exercise: exercise, index: index } });
                  }}
                >
                  <ListItemText
                    primary={exercise.name}
                    primaryTypographyProps={{ fontSize: '1.2rem', fontWeight: 500, color: '#333' }}
                  />
                </StyledListItemButton>

              </ListItem>
            ))}
          </List>
        </StyledPaper>
      </Container>
    </Box>
  );
};

export default ExerciseList;
