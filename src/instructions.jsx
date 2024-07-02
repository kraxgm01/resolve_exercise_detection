import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    Container,
    Typography,
    Box,
    Chip,
    Paper,
    Grid,
    Button,
} from "@mui/material";

function Intructions() {
    const [exercises, setExercises] = useState([]);
    const navigate = useNavigate();
    const location = useLocation();
    const { exercise, index } = location.state;

    //to={`/exercise/${index}/0`}

    function startExercise() {
        navigate(`/exercise/${index}/0`);
        window.location.reload();
    }

    return (
        <Box sx={{ minHeight: '100vh', minWidth: '200vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: 8, backgroundColor: '#f5f5f5' }}>
            <Container sx={{padding: 4 }}>
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 2,
                    }}
                >
                    <Typography
                        variant="h4"
                        gutterBottom
                        sx={{
                            fontFamily: "var(--Font-1)",
                            fontWeight: 700,
                            color: "var(--Gray-900, #101828)",
                            paddingRight: 113,
                        }}
                    >
                        {exercise?.name ?? "Exercise Name"}
                    </Typography>
                </Box>

                <Typography
                    variant="body1"
                    sx={{
                        marginBottom: 2,
                        fontFamily: "var(--Font-1)",
                        color: "var(--Gray-700, #344054)",
                    }}
                >
                    {exercise?.description ?? "Exercise Description"}
                </Typography>

                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", marginBottom: 4 }}>
                    {exercise?.tags?.map((tag, tagIndex) => (
                        <Chip
                            key={tagIndex}
                            label={tag}
                            variant="outlined"
                            sx={{
                                fontWeight: 700,
                                color: "#175CD3",
                                borderColor: "#B2DDFF",
                                backgroundColor: "#EFF8FF",
                            }}
                        />
                    ))}
                </Box>

                <Grid container spacing={2} marginBottom={4}>
                    {exercise?.steps?.map((step) => (
                        <Grid item md={4} key={step.sequence_number}>
                            <Paper
                                sx={{
                                    borderRadius: 3,
                                    overflow: "hidden",
                                    display: "flex",
                                    flexDirection: "column",
                                }}
                            >
                                <Box
                                    sx={{ position: "relative", width: "100%", height: "200px" }}
                                >
                                    <img
                                        src={`data:image/png;base64,${step.image}`}
                                        alt={`Step ${step.sequence_number}`}
                                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                    />
                                    <canvas
                                        id={`canvas-${step.sequence_number}`}
                                        style={{
                                            position: "absolute",
                                            top: 0,
                                            left: 0,
                                            width: "100%",
                                            height: "100%",
                                            pointerEvents: "none",
                                        }}
                                    />
                                </Box>
                                <Box sx={{ padding: 2, flexGrow: 1 }}>
                                    <Typography
                                        variant="h6"
                                        gutterBottom
                                        sx={{
                                            fontFamily: "var(--Font-1)",
                                            fontWeight: 700,
                                            color: "var(--Gray-900, #101828)",
                                        }}
                                    >
                                        Step {step.sequence_number}
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            fontFamily: "var(--Font-1)",
                                            color: "var(--Gray-700, #344054)",
                                            overflowWrap: "break-word",
                                        }}
                                    >
                                        {step.description}
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            fontFamily: "var(--Font-1)",
                                            color: "var(--Gray-700, #344054)",
                                            marginTop: 1,
                                        }}
                                    >
                                        Counts: {step.counts}
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            fontFamily: "var(--Font-1)",
                                            color: "var(--Gray-700, #344054)",
                                            marginTop: 1,
                                        }}
                                    >
                                        Step Duration: {step.countDuration} seconds
                                    </Typography>
                                </Box>
                            </Paper>
                        </Grid>
                    ))}
                </Grid>
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginTop: 2,
                        marginBottom: 8,
                    }}
                >
                    <Button
                        onClick={() =>
                            startExercise()
                        }
                        variant="contained"
                        sx={{
                            background: "var(--Blue-light-500, #0BA5EC)",
                            borderRadius: "8px",
                            fontWeight: 700,
                        }}
                    >
                        Start Exericse
                    </Button>
                </Box>
            </Container>
        </Box>

    );
}

export default Intructions;
